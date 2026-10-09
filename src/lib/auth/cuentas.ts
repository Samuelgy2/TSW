import "server-only";

import type { User } from "@supabase/supabase-js";

import { crearClienteAdmin } from "@/lib/supabase/admin";

/**
 * Búsqueda de cuentas de Auth por correo.
 *
 * El correo vive en `auth.users` y PostgREST no expone ese esquema, así que
 * no hay `select ... where email = ?`: la Admin API solo sabe paginar. Con
 * las decenas de cuentas que tendrá la corporación es una llamada.
 *
 * Vive aparte de `queries-perfiles.ts` porque hay dos usos con permisos muy
 * distintos: el panel pregunta con sesión de administrador, y la puerta de
 * acceso pregunta SIN sesión —hay que saber si un correo es de un
 * administrador activo antes de mandarle un código—. Ese segundo uso obliga a
 * que quien llame responda lo mismo en los dos casos: si la respuesta
 * cambiara, esta función sería un enumerador de correos.
 */

/** Mapa id → usuario de Auth de todas las cuentas. La Admin API pagina de a 1000. */
export async function cuentasDeAuth(): Promise<Map<string, User>> {
  const supabase = crearClienteAdmin();
  const mapa = new Map<string, User>();
  const porPagina = 1000;

  for (let pagina = 1; pagina <= 20; pagina += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: pagina, perPage: porPagina });
    if (error) throw error;
    for (const usuario of data.users) mapa.set(usuario.id, usuario);
    if (data.users.length < porPagina) break;
  }

  return mapa;
}

/** La cuenta con ese correo, o null. Auth guarda el correo en minúsculas. */
export async function buscarCuentaPorCorreo(correo: string): Promise<User | null> {
  const buscado = correo.trim().toLowerCase();
  const cuentas = await cuentasDeAuth();
  for (const usuario of cuentas.values()) {
    if (usuario.email?.toLowerCase() === buscado) return usuario;
  }
  return null;
}
