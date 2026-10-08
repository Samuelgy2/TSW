import "server-only";

import { cookies } from "next/headers";

import { COOKIE_ACTIVIDAD, OPCIONES_COOKIE_ACTIVIDAD, firmarActividad } from "./actividad";

/**
 * Abre (o renueva) la cookie de actividad del panel. Se llama en cada punto
 * donde un administrador obtiene sesión: contraseña, código de correo y enlace
 * de correo. Sin esta cookie, el middleware trata la sesión como caducada.
 */
export async function iniciarActividad(usuarioId: string): Promise<void> {
  (await cookies()).set(COOKIE_ACTIVIDAD, await firmarActividad(usuarioId), OPCIONES_COOKIE_ACTIVIDAD);
}
