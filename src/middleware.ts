import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const RUTA_ACCESO = "/admin/acceso";

/**
 * Hace dos cosas en cada petición:
 *  1. Refresca la sesión de Supabase (las cookies se renuevan aquí, no en los
 *     Server Components, que no pueden escribirlas).
 *  2. Protege /admin: sin sesión o sin rol admin, se redirige al acceso.
 */
export async function middleware(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

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

  const ruta = request.nextUrl.pathname;
  const esRutaAdmin = ruta.startsWith("/admin");
  const esRutaAcceso = ruta.startsWith(RUTA_ACCESO);

  if (esRutaAdmin && !esRutaAcceso) {
    // Un solo usuario en el sistema: tener sesión es ser administrador. El
    // registro público está cerrado en Supabase Auth y el usuario se crea a
    // mano, así que no hay forma de obtener sesión sin ser el admin.
    if (!user) {
      const destino = request.nextUrl.clone();
      destino.pathname = RUTA_ACCESO;
      destino.searchParams.set("redirigir", ruta);
      return NextResponse.redirect(destino);
    }
  }

  return respuesta;
}

export const config = {
  matcher: [
    // Todo menos estáticos, imágenes optimizadas, favicon y el webhook de
    // Wompi (que no trae cookies y no debe pagar el costo de refrescar sesión).
    "/((?!_next/static|_next/image|favicon.ico|api/wompi/webhook|.*\.(?:svg|png|jpg|jpeg|webp|avif|gif|ico|pdf)$).*)",
  ],
};
