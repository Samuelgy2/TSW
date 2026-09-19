import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { RUTA_LOGIN, RUTA_PANEL, esRutaAdminPublica } from "@/lib/auth/rutas";

/**
 * Hace dos cosas en cada petición:
 *  1. Refresca la sesión de Supabase (las cookies se renuevan aquí, no en los
 *     Server Components, que no pueden escribirlas).
 *  2. Protege /admin: sin sesión se redirige al acceso guardando el destino.
 *
 * Es conveniencia, no la defensa real: cada página y cada Server Action del
 * panel vuelve a verificar la sesión con `exigirSesionPagina` / `exigirAdmin`.
 *
 * Solo se consulta al servidor de Auth cuando hay cookie de sesión: la mayoría
 * del tráfico es anónimo y no tiene sentido pagar una ida a Auth por cada
 * página pública.
 */
export async function middleware(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const ruta = request.nextUrl.pathname;
  const esRutaAdmin = ruta.startsWith("/admin");
  const hayCookieSesion = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));

  if (!esRutaAdmin && !hayCookieSesion) return respuesta;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesNuevas) {
          for (const { name, value } of cookiesNuevas) {
            request.cookies.set(name, value);
          }
          respuesta = NextResponse.next({ request });
          for (const { name, value, options } of cookiesNuevas) {
            respuesta.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() valida el token contra el servidor de Auth; getSession() no.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!esRutaAdmin) return respuesta;

  // Un solo usuario en el sistema: tener sesión es ser administrador. El
  // registro público está cerrado en Supabase Auth y el usuario se crea a
  // mano, así que no hay forma de obtener sesión sin ser el admin.
  if (!user && !esRutaAdminPublica(ruta)) {
    const destino = request.nextUrl.clone();
    destino.pathname = RUTA_LOGIN;
    destino.search = "";
    destino.searchParams.set("redirigir", ruta + request.nextUrl.search);
    return NextResponse.redirect(destino);
  }

  // Con sesión, el acceso y la recuperación no tienen sentido: al panel.
  if (user && (ruta === RUTA_LOGIN || ruta === "/admin/recuperar")) {
    const destino = request.nextUrl.clone();
    destino.pathname = RUTA_PANEL;
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return respuesta;
}

export const config = {
  matcher: [
    // Todo menos estáticos, imágenes optimizadas, favicon y el webhook de
    // Wompi (que no trae cookies y no debe pagar el costo de refrescar sesión).
    "/((?!_next/static|_next/image|favicon.ico|api/wompi/webhook|.*\\.(?:svg|png|jpg|jpeg|webp|avif|gif|ico|pdf)$).*)",
  ],
};
