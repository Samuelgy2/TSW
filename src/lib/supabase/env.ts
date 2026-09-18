import { z } from "zod";

/**
 * Variables de entorno de Supabase, validadas al arrancar.
 * Si falta una, el proceso falla con un mensaje claro en vez de fallar
 * después con un 401 difícil de rastrear.
 */
const esquemaPublico = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Falta NEXT_PUBLIC_SUPABASE_ANON_KEY"),
});

/**
 * Se leen por nombre completo (no con índice dinámico) porque Next.js
 * reemplaza `process.env.NEXT_PUBLIC_*` en tiempo de compilación.
 */
export const entornoSupabase = esquemaPublico.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

/** Solo debe llamarse desde código de servidor. */
export function leerServiceRoleKey(): string {
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!clave) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY. Esta variable solo existe en el servidor.",
    );
  }
  return clave;
}
