import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { entornoSupabase } from "./env";
import type { Database } from "./database.types";

/**
 * Cliente para Server Components, Server Actions y route handlers.
 * Actúa con la sesión del usuario (anon o admin): RLS sigue aplicando.
 */
export async function crearClienteServidor() {
  const almacenCookies = await cookies();

  return createServerClient<Database>(
    entornoSupabase.NEXT_PUBLIC_SUPABASE_URL,
    entornoSupabase.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return almacenCookies.getAll();
        },
        setAll(cookiesNuevas) {
          try {
            for (const { name, value, options } of cookiesNuevas) {
              almacenCookies.set(name, value, options);
            }
          } catch {
            // Un Server Component no puede escribir cookies. El middleware ya
            // refresca la sesión, así que aquí se puede ignorar sin riesgo.
          }
        },
      },
    },
  );
}
