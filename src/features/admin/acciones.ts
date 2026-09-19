"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { RUTA_LOGIN, destinoSeguro, exigirAdmin } from "@/lib/auth";
import { registrarAcierto, registrarFallo, segundosDeBloqueo } from "@/lib/auth/limite";
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
  | { ok: false; error: string; campos?: Record<string, string> };

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

async function ipDelCliente(): Promise<string> {
  const cabeceras = await headers();
  return (
    cabeceras.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    cabeceras.get("x-real-ip") ||
    "desconocida"
  );
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

  const clave = `${await ipDelCliente()}|${datos.data.correo.toLowerCase()}`;
  const bloqueo = segundosDeBloqueo(clave);
  if (bloqueo > 0) {
    const minutos = Math.ceil(bloqueo / 60);
    return {
      ok: false,
      error: `Demasiados intentos. Espera ${minutos} ${minutos === 1 ? "minuto" : "minutos"} antes de volver a intentar.`,
    };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: datos.data.correo,
    password: datos.data.contrasena,
  });

  if (error) {
    registrarFallo(clave);
    // Cualquier fallo de Auth se reporta igual. Distinguir "no existe" de
    // "contraseña errada" permitiría enumerar correos.
    return { ok: false, error: CREDENCIALES_INCORRECTAS };
  }

  registrarAcierto(clave);
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
 * /admin/auth/callback, que canjea el código por sesión y lleva a
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

  const sitio = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.resetPasswordForEmail(datos.data.correo, {
    redirectTo: `${sitio}/admin/auth/callback?siguiente=/admin/restablecer`,
  });

  if (error) {
    // Se registra para diagnóstico pero no se distingue de cara al usuario.
    console.error("[recuperación de contraseña]", error.message);
  }

  return {
    ok: true,
    mensaje: "Si el correo corresponde a la cuenta del administrador, recibirás un enlace en unos minutos.",
  };
}

/** Fija la nueva contraseña. Exige la sesión que abrió el enlace de recuperación. */
export async function restablecerContrasena(entrada: EntradaNuevaContrasena): Promise<ResultadoAccion> {
  const datos = esquemaNuevaContrasena.safeParse(entrada);
  if (!datos.success) {
    return { ok: false, error: "Revisa los datos.", campos: camposDeZod(datos.error) };
  }

  try {
    await exigirAdmin();
  } catch {
    return { ok: false, error: "El enlace de recuperación venció. Solicita uno nuevo." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.updateUser({ password: datos.data.contrasena });
  if (error) {
    return { ok: false, error: "No se pudo cambiar la contraseña. Solicita un enlace nuevo e inténtalo otra vez." };
  }

  return { ok: true, mensaje: "Contraseña actualizada." };
}
