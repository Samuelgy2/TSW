"use client";

import { createBrowserClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";

import { comoCookieDeSesion } from "./cookies-sesion";
import { entornoSupabase } from "./env";
import type { Database } from "./database.types";

/**
 * Cliente para componentes de cliente. Usa la anon key, así que solo ve lo
 * que permitan las políticas RLS.
 *
 * Las cookies se manejan a mano: el cliente de @supabase/ssr fuerza `maxAge` de
 * 400 días al escribirlas, y si este cliente refrescara el token dejaría la
 * sesión persistente otra vez, aunque el servidor ya la hubiera hecho de sesión.
 */
export function crearClienteNavegador() {
  return createBrowserClient<Database>(
    entornoSupabase.NEXT_PUBLIC_SUPABASE_URL,
    entornoSupabase.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(document.cookie).flatMap(({ name, value }) =>
            value === undefined ? [] : [{ name, value }],
          );
        },
        setAll(cookiesNuevas) {
          for (const { name, value, options } of cookiesNuevas) {
            document.cookie = serializeCookieHeader(name, value, comoCookieDeSesion(options, value));
          }
        },
      },
    },
  );
}
