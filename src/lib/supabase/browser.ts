"use client";

import { createBrowserClient } from "@supabase/ssr";

import { entornoSupabase } from "./env";
import type { Database } from "./database.types";

/**
 * Cliente para componentes de cliente. Usa la anon key, así que solo ve lo
 * que permitan las políticas RLS.
 */
export function crearClienteNavegador() {
  return createBrowserClient<Database>(
    entornoSupabase.NEXT_PUBLIC_SUPABASE_URL,
    entornoSupabase.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
