import "server-only";

import { createClient } from "@supabase/supabase-js";

import { entornoSupabase, leerServiceRoleKey } from "./env";
import type { Database } from "./database.types";

/**
 * ⚠️ CLIENTE CON SERVICE ROLE: SALTA RLS POR COMPLETO.
 *
 * Solo se importa desde código que corre en el servidor (route handlers,
 * Server Actions, tareas de Vercel Cron). El import de "server-only" hace
 * fallar la compilación si alguien lo arrastra a un componente de cliente.
 *
 * Toda escritura del sitio pasa por aquí: el público y el panel nunca
 * escriben con la anon key.
 */
export function crearClienteAdmin() {
  return createClient<Database>(
    entornoSupabase.NEXT_PUBLIC_SUPABASE_URL,
    leerServiceRoleKey(),
    {
      auth: {
        // No hay sesión que persistir: es un cliente de servidor sin usuario.
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
