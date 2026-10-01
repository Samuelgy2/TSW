"use server";

import { redirect } from "next/navigation";

import { RUTA_LOGIN, destinoSeguro, obtenerUsuario } from "@/lib/auth";
import { enviarCodigoAcceso, enviarRestablecerContrasena } from "@/lib/auth/enlaces";
import { MAX_INTENTOS_POR_IP, bloqueoAcceso, registrarAcierto, registrarFallo, segundosDeBloqueo } from "@/lib/auth/limite";
import { iniciarActividad } from "@/lib/auth/actividad-servidor";
import { ipDelCliente } from "@/lib/auth/ip";
import { crearClienteServidor } from "@/lib/supabase/server";
import {
  esquemaAcceso,
  esquemaNuevaContrasena,
  esquemaRecuperacion,
  esquemaSolicitudCodigo,
  esquemaVerificacionCodigo,
  type EntradaAcceso,
  type EntradaNuevaContrasena,
  type EntradaRecuperacion,
  type EntradaSolicitudCodigo,
  type EntradaVerificacionCodigo,
} from "./schemas";

/** Resultado de una acción del panel cuando no redirige. */
export type ResultadoAccion =
  | { ok: true; mensaje?: string }
  | { ok: false; error: string; campos?: Record<string, string>; /** Segundos de bloqueo restantes (acceso). */ espera?: number };

/** Mismo mensaje para usuario inexistente y contraseña errada: no se enumeran usuarios. */
const CREDENCIALES_INCORRECTAS = "Credenciales incorrectas.";

function camposDeZod(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const campos: Record<string, string> = {};
  for (const problema of error.issues) {
    const clave = String(problema.path[0] ?? "_");
    campos[clave] ??= problema.message;
  }
  return campos;
}

/**
 * Inicio de sesión. Valida en el servidor (la validación del cliente es solo
 * comodidad), aplica el límite de intentos y, si entra, redirige al destino
 * guardado o al panel.
 */
export async function iniciarSesion(entrada: EntradaAcceso): Promise<ResultadoAccion> {
  const datos = esquemaAcceso.safeParse(entrada);
  if (!datos.success) {
    return { ok: false, error: "Revisa los datos.", campos: camposDeZod(datos.error) };
  }

  const ip = await ipDelCliente();
  const clave = `${ip}|${datos.data.correo.toLowerCase()}`;
  const claveIp = `ip|${ip}`;
  const bloqueado = bloqueoAcceso(clave, claveIp);
  if (bloqueado) return bloqueado;

  const supabase = await crearClienteServidor();
  const { data: sesionAuth, error } = await supabase.auth.signInWithPassword({
    email: datos.data.correo,
    password: datos.data.contrasena,
  });

  if (error) {
    registrarFallo(clave);
    registrarFallo(claveIp, MAX_INTENTOS_POR_IP);
    const ahoraBloqueado = bloqueoAcceso(clave, claveIp);
    if (ahoraBloqueado) return ahoraBloqueado;
    // Cualquier fallo de Auth se reporta igual. Distinguir "no existe" de
    // "contraseña errada" permitiría enumerar correos.
    return { ok: false, error: CREDENCIALES_INCORRECTAS };
  }

  // Puerta exclusiva de administradores: perfil_admin ACTIVO, vía la RPC
  // es_admin() (security definer: ve la verdad aunque RLS deje al inactivo
  // sin leer su fila). Si no lo hay, se cierra la sesión y se responde con el
  // MISMO mensaje que una contraseña errada: no se revela que el correo
  // existe, ni de qué tipo es la cuenta.
  const { data: esAdmin } = await supabase.rpc("es_admin");
  if (!esAdmin) {
    await supabase.auth.signOut();
    return { ok: false, error: CREDENCIALES_INCORRECTAS };
  }

  registrarAcierto(clave);
  await iniciarActividad(sesionAuth.user.id);
  redirect(destinoSeguro(datos.data.redirigir));
}

// --- Acceso con código por correo -------------------------------------------

/**
 * Respuesta única de «pedir código», exista o no el correo. La pantalla de
 * acceso no puede servir para averiguar qué correos son de administradores.
 */
const CODIGO_ENVIADO = "Si el correo corresponde a un administrador, te enviamos un código.";

/** Un código gastado y uno equivocado son el mismo caso para Supabase, y para nosotros. */
const CODIGO_INVALIDO = "Código incorrecto o vencido. Pide uno nuevo.";

/**
 * Suelo de tiempo de respuesta, en milisegundos.
 *
 * Sin él, «no es administrador» contesta en lo que tarda una consulta y «sí
 * lo es» en lo que tarda además generar el código y entregar el correo al
 * servidor SMTP: la diferencia, cronometrada, delata qué correos son de
 * administradores aunque el mensaje sea idéntico. Con el suelo las dos ramas
 * tardan lo mismo mientras el envío quepa debajo.
 *
 * No lo cierra del todo —un SMTP lento se sale del suelo— y no pretende
 * hacerlo: la barrera real es el límite de intentos, que corta la medición
 * repetida mucho antes de que dé una estadística.
 */
const PISO_RESPUESTA_MS = 1200;

function esperar(ms: number): Promise<void> {
  return new Promise((listo) => setTimeout(listo, ms));
}

async function completarPiso(inicio: number): Promise<void> {
  const falta = PISO_RESPUESTA_MS - (Date.now() - inicio);
  if (falta > 0) await esperar(falta);
}

/**
 * Manda un código de acceso de un solo uso, si el correo es de un
 * administrador activo.
 *
 * El código lo genera y lo valida Supabase; nosotros solo lo entregamos. La
 * comprobación de administrador activo va ANTES de generar nada, y no por
 * ahorrar trabajo: `generateLink` de tipo magiclink crea la cuenta cuando el
 * correo no existe (ver lib/auth/enlaces.ts). Esta pantalla es pública.
 */
export async function solicitarCodigoAcceso(entrada: EntradaSolicitudCodigo): Promise<ResultadoAccion> {
  const inicio = Date.now();
  const datos = esquemaSolicitudCodigo.safeParse(entrada);
  if (!datos.success) {
    return { ok: false, error: "Revisa los datos.", campos: camposDeZod(datos.error) };
  }

  const correo = datos.data.correo.toLowerCase();
  // Dos llaves, no una combinada como en el acceso con contraseña: aquí el
  // abuso que importa es repartir un correo distinto por intento desde la
  // misma IP, y una llave `ip|correo` cambiaría con cada correo probado.
  const porCorreo = `codigo|${correo}`;
  const porIp = `codigo-ip|${await ipDelCliente()}`;

  if (segundosDeBloqueo(porCorreo) > 0 || segundosDeBloqueo(porIp) > 0) {
    await completarPiso(inicio);
    // Mismo mensaje que el caso bueno: decir «demasiadas solicitudes» para un
    // correo y el genérico para otro también distingue cuentas.
    return { ok: true, mensaje: CODIGO_ENVIADO };
  }
  registrarFallo(porCorreo);
  registrarFallo(porIp);

  try {
    await enviarCodigoAcceso(correo);
  } catch (error) {
    // Al log solo el mensaje. Nunca el código, que ni siquiera llega hasta aquí.
    console.error("[código de acceso]", error instanceof Error ? error.message : error);
  }

  await completarPiso(inicio);
  return { ok: true, mensaje: CODIGO_ENVIADO };
}

/**
 * Canjea el código por sesión y entra al panel.
 *
 * `verifyOtp` va con el cliente de servidor, el que escribe cookies: la
 * sesión queda igual que la del acceso con contraseña, y el middleware y
 * `exigirAdminPagina` la ven sin saber por dónde entró.
 *
 * Después de abrir la sesión se repite la comprobación de administrador
 * activo, igual que en `iniciarSesion`. El código demuestra que la persona
 * lee ese buzón, no que tenga permiso: si alguien pidió el código cuando era
 * administrador y lo desactivan mientras va a buscarlo al correo, el código
 * sigue siendo válido para Supabase y no debe abrir el panel.
 */
export async function verificarCodigoAcceso(
  entrada: EntradaVerificacionCodigo,
): Promise<ResultadoAccion> {
  const datos = esquemaVerificacionCodigo.safeParse(entrada);
  if (!datos.success) {
    return { ok: false, error: "Revisa los datos.", campos: camposDeZod(datos.error) };
  }

  const correo = datos.data.correo.toLowerCase();
  const clave = `codigo-intento|${correo}`;
  const bloqueo = segundosDeBloqueo(clave);
  if (bloqueo > 0) {
    const minutos = Math.ceil(bloqueo / 60);
    return {
      ok: false,
      error: `Demasiados intentos. Espera ${minutos} ${minutos === 1 ? "minuto" : "minutos"} antes de volver a intentar.`,
    };
  }

  const supabase = await crearClienteServidor();
  // `type: "email"` y no `"magiclink"`: es el que acepta el email_otp que
  // devuelve generateLink. Comprobado contra @supabase/supabase-js 2.116.0
  // y el proyecto real, no supuesto.
  const { data: verificado, error } = await supabase.auth.verifyOtp({
    email: correo,
    token: datos.data.codigo,
    type: "email",
  });

  if (error) {
    registrarFallo(clave);
    return { ok: false, error: CODIGO_INVALIDO };
  }

  const { data: esAdmin } = await supabase.rpc("es_admin");
  if (!esAdmin) {
    await supabase.auth.signOut();
    registrarFallo(clave);
    return { ok: false, error: CREDENCIALES_INCORRECTAS };
  }

  registrarAcierto(clave);
  if (verificado.user) await iniciarActividad(verificado.user.id);
  redirect(destinoSeguro(datos.data.redirigir));
}

/** Cierra la sesión y vuelve al acceso. Solo tiene sentido con sesión. */
export async function cerrarSesion(): Promise<void> {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect(RUTA_LOGIN);
}

/**
 * Envía el enlace de recuperación. La respuesta es la misma exista o no el
 * correo, por la misma razón que en el acceso. El enlace vuelve por
 * /admin/auth/callback, que canjea el token por sesión y lleva a
 * /admin/restablecer.
 */
export async function solicitarRecuperacion(entrada: EntradaRecuperacion): Promise<ResultadoAccion> {
  const datos = esquemaRecuperacion.safeParse(entrada);
  if (!datos.success) {
    return { ok: false, error: "Revisa los datos.", campos: camposDeZod(datos.error) };
  }

  const clave = `recuperar|${await ipDelCliente()}`;
  if (segundosDeBloqueo(clave) > 0) {
    return { ok: false, error: "Demasiadas solicitudes. Espera unos minutos." };
  }
  registrarFallo(clave);

  // El enlace lo genera Supabase y el correo lo manda la aplicación
  // (lib/auth/enlaces.ts). Si el correo no tiene cuenta, o el envío falla,
  // se registra para diagnóstico pero no se distingue de cara al usuario.
  try {
    await enviarRestablecerContrasena(datos.data.correo, "admin");
  } catch (error) {
    console.error("[recuperación de contraseña]", error instanceof Error ? error.message : error);
  }

  return {
    ok: true,
    mensaje: "Si el correo corresponde a la cuenta del administrador, recibirás un enlace en unos minutos.",
  };
}

/**
 * Fija la nueva contraseña. Exige la sesión que abrió el enlace de
 * recuperación, pero NO un perfil activo: el restablecimiento es justamente el
 * paso ANTES de la activación de una cuenta invitada (nace desactivada, migra-
 * ción 13). Exigir administrador aquí bloquearía el alta de cualquier admin
 * nuevo con "El enlace de recuperación venció", que además sería mentira.
 */
export async function restablecerContrasena(entrada: EntradaNuevaContrasena): Promise<ResultadoAccion> {
  const datos = esquemaNuevaContrasena.safeParse(entrada);
  if (!datos.success) {
    return { ok: false, error: "Revisa los datos.", campos: camposDeZod(datos.error) };
  }

  const usuario = await obtenerUsuario();
  if (!usuario) {
    return { ok: false, error: "El enlace de recuperación venció. Solicita uno nuevo." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.updateUser({ password: datos.data.contrasena });
  if (error) {
    return { ok: false, error: "No se pudo cambiar la contraseña. Solicita un enlace nuevo e inténtalo otra vez." };
  }

  return { ok: true, mensaje: "Contraseña actualizada." };
}
