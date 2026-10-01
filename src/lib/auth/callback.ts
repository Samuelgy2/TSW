import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { crearClienteServidor } from "@/lib/supabase/server";
import { iniciarActividad } from "./actividad-servidor";

/**
 * Canje del enlace que llega por correo (recuperación de contraseña o
 * invitación) por una sesión, común a las dos puertas.
 *
 * Dos formatos de enlace, por una razón de fondo:
 *
 *  · `?code=…` (PKCE). Lo genera Supabase cuando la solicitud salió del
 *    navegador de la misma persona (p. ej. "olvidé mi contraseña"): el
 *    verificador vive en su cookie y `exchangeCodeForSession` lo cierra.
 *    NO sirve cuando el enlace lo pidió otra persona —una invitación desde el
 *    panel— ni cuando se abre en otro dispositivo: sin verificador no hay
 *    canje.
 *
 *  · `?token_hash=…&type=recovery|invite`. Es el formato que Supabase
 *    recomienda para SSR: el hash se canjea con `verifyOtp` sin depender de
 *    cookies previas. Es el que usan TODOS los correos que manda la
 *    aplicación (lib/auth/enlaces.ts genera el token con `generateLink` y
 *    lib/correo lo envía), así que no dependemos de las plantillas ni de las
 *    Redirect URLs del panel de Supabase.
 *
 * Solo se admiten los tipos que el sitio usa. El destino tras el canje se
 * restringe al área de la puerta (`prefijo`): nada de redirecciones abiertas.
 */
const TIPOS_ADMITIDOS: ReadonlySet<EmailOtpType> = new Set<EmailOtpType>(["recovery", "invite"]);

export async function canjearEnlaceDeCorreo(
  request: NextRequest,
  opciones: { prefijo: "/admin" | "/cuenta"; destinoPorDefecto: string; rutaError: string },
): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;
  const siguiente = searchParams.get("siguiente") ?? opciones.destinoPorDefecto;
  const destino =
    siguiente.startsWith(opciones.prefijo) && !siguiente.startsWith("//") ? siguiente : opciones.prefijo;

  const supabase = await crearClienteServidor();

  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && tipo && TIPOS_ADMITIDOS.has(tipo)) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
    if (!error) {
      if (opciones.prefijo === "/admin" && data.user) await iniciarActividad(data.user.id);
      return NextResponse.redirect(`${origin}${destino}`);
    }
  }

  const codigo = searchParams.get("code");
  if (codigo) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) {
      if (opciones.prefijo === "/admin" && data.user) await iniciarActividad(data.user.id);
      return NextResponse.redirect(`${origin}${destino}`);
    }
  }

  return NextResponse.redirect(`${origin}${opciones.rutaError}`);
}
