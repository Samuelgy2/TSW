import "server-only";

import { URL_SITIO } from "@/config/sitio";
import { VIGENCIA_CODIGO_ACCESO } from "@/features/admin/constantes";
import {
  correoCodigoAcceso,
  correoInvitacion,
  correoRestablecerContrasena,
} from "@/lib/correo/plantillas";
import { enviarCorreo } from "@/lib/correo/transporte";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { esAdminActivoPorCorreo } from "./cuentas";

/**
 * Enlaces de acceso por correo (restablecer contraseña e invitaciones).
 *
 * Supabase genera el token con `auth.admin.generateLink` y NO manda nada; el
 * correo lo arma y lo envía la aplicación (`lib/correo`). El enlace apunta a
 * nuestro callback con `token_hash`, que `lib/auth/callback.ts` canjea con
 * `verifyOtp`: funciona desde cualquier dispositivo y no depende de
 * plantillas ni de Redirect URLs del panel de Supabase.
 *
 * Solo se usa el tipo `recovery`, también para invitar: una invitación es
 * "fija tu contraseña por primera vez", que es exactamente lo que hace el
 * flujo de recuperación sobre una cuenta recién creada.
 */

export type Puerta = "admin" | "usuario";

/** URL canónica del sitio, sin barra final. */
export function urlSitio(): string {
  return URL_SITIO;
}

function callbackDe(puerta: Puerta): string {
  return puerta === "admin"
    ? `${urlSitio()}/admin/auth/callback?siguiente=/admin/restablecer`
    : `${urlSitio()}/cuenta/auth/callback?siguiente=/cuenta/restablecer`;
}

/**
 * Enlace de "fija tu contraseña" para un correo, o null si no existe cuenta
 * con ese correo. El null no se distingue de cara al público: quien llama
 * responde lo mismo en ambos casos.
 */
export async function generarEnlaceContrasena(correo: string, puerta: Puerta): Promise<string | null> {
  const { data, error } = await crearClienteAdmin().auth.admin.generateLink({
    type: "recovery",
    email: correo,
  });

  if (error) {
    if (error.code === "user_not_found" || /not found/i.test(error.message)) return null;
    throw error;
  }

  const tokenHash = data.properties?.hashed_token;
  if (!tokenHash) throw new Error("Supabase no devolvió el token del enlace.");

  return `${callbackDe(puerta)}&token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;
}

/**
 * "Olvidé mi contraseña": genera y envía. Devuelve false si el correo no
 * tiene cuenta; el formulario público NO debe reflejar esa diferencia.
 */
export async function enviarRestablecerContrasena(correo: string, puerta: Puerta): Promise<boolean> {
  const enlace = await generarEnlaceContrasena(correo, puerta);
  if (!enlace) return false;
  await enviarCorreo(correoRestablecerContrasena({ para: correo, enlace }));
  return true;
}

/** Invitación a una cuenta recién creada: mismo enlace, otro texto. */
export async function enviarInvitacion(correo: string, puerta: Puerta, nombre?: string | null): Promise<void> {
  const enlace = await generarEnlaceContrasena(correo, puerta);
  if (!enlace) throw new Error("La cuenta no existe en Auth: no hay a quién invitar.");
  await enviarCorreo(correoInvitacion({ para: correo, enlace, nombre, tipo: puerta }));
}

/**
 * Código de acceso de un solo uso para entrar al panel sin contraseña.
 *
 * Supabase genera y valida el código; aquí solo se entrega. NO se genera ni
 * se compara nada por nuestra cuenta: un generador propio sería otro secreto
 * que guardar y otra comparación que equivocar.
 *
 * ORDEN OBLIGATORIO, y no es una preferencia de estilo: `generateLink` de
 * tipo `magiclink` **crea la cuenta** si el correo no existe. Medido contra
 * el proyecto real el 2026-09-22: con un correo inventado devolvió un `user`
 * nuevo y auth.users pasó de 4 filas a 5. Comprobar primero que el correo sea
 * de un administrador activo es lo único que impide que esta pantalla, que es
 * pública, sirva para sembrar cuentas.
 *
 * Devuelve false cuando el correo no corresponde a un administrador activo.
 * Quien llama DEBE responder lo mismo en los dos casos.
 */
export async function enviarCodigoAcceso(correo: string): Promise<boolean> {
  if (!(await esAdminActivoPorCorreo(correo))) return false;

  const { data, error } = await crearClienteAdmin().auth.admin.generateLink({
    type: "magiclink",
    email: correo,
  });
  if (error) throw error;

  const codigo = data.properties?.email_otp;
  // Sin el código no hay nada que mandar, y el mensaje no lo incluye: un
  // error con el código dentro acabaría en el log del servidor.
  if (!codigo) throw new Error("Supabase no devolvió el código de acceso.");

  await enviarCorreo(
    correoCodigoAcceso({
      para: correo,
      codigo,
      vigencia: VIGENCIA_CODIGO_ACCESO,
    }),
  );
  return true;
}
