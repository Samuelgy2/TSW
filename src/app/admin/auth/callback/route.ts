import { NextResponse, type NextRequest } from "next/server";

import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * Retorno del enlace de recuperación de contraseña (flujo PKCE de Supabase).
 * Canjea el `code` por una sesión y lleva a la página de nueva contraseña.
 * Sin código o con código vencido, vuelve a la solicitud con un aviso.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const codigo = searchParams.get("code");
  const siguiente = searchParams.get("siguiente") ?? "/admin/restablecer";
  // Solo destinos del panel: nada de redirecciones abiertas.
  const destino = siguiente.startsWith("/admin") && !siguiente.startsWith("//") ? siguiente : "/admin";

  if (codigo) {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) return NextResponse.redirect(`${origin}${destino}`);
  }

  return NextResponse.redirect(`${origin}/admin/recuperar?error=enlace`);
}
