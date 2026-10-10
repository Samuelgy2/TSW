"use server";

import { redirect } from "next/navigation";

import { RUTA_LOGIN, destinoSeguro, obtenerUsuario } from "@/lib/auth";
import { enviarRestablecerContrasena } from "@/lib/auth/enlaces";
import { MAX_INTENTOS_POR_IP, bloqueoAcceso, registrarAcierto, registrarFallo, segundosDeBloqueo } from "@/lib/auth/limite";
import { iniciarActividad } from "@/lib/auth/actividad-servidor";
import { ipDelCliente } from "@/lib/auth/ip";
import { crearClienteServidor } from "@/lib/supabase/server";
import {
  esquemaAcceso,
  esquemaNuevaContrasena,
  esquemaRecuperacion,
  type EntradaAcceso,
  type EntradaNuevaContrasena,
  type EntradaRecuperacion,
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

/** Cierra la sesión y vuelve al acceso. Solo tiene sentido con sesión. */
export async function cerrarSesion(): Promise<void> {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect(RUTA_LOGIN);
}

/** Cierre disparado por el temporizador de inactividad del navegador: vuelve al acceso con el aviso. */
export async function cerrarSesionPorInactividad(): Promise<void> {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect(`${RUTA_LOGIN}?sesion=expirada`);
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
