import "server-only";

import type { User } from "@supabase/supabase-js";

import { crearClienteServidor } from "@/lib/supabase/server";
import { ErrorNoAutorizado } from "@/lib/errors";

/**
 * Hay un único usuario en el sistema y es el administrador: no existe registro
 * público ni rol adicional, así que estar autenticado equivale a ser
 * administrador. Las políticas de RLS están escritas sobre esa premisa.
 *
 * El registro está cerrado en la configuración de Supabase Auth; el usuario se
 * crea a mano desde el panel. Si algún día hay más usuarios, aquí es donde se
 * agrega la comprobación de rol, y en las políticas `*_admin` de la migración
 * 08.
 */
export type SesionAdmin = {
  usuario: User;
};

/** Usuario verificado contra el servidor de Auth, o null si no hay sesión. */
export async function obtenerUsuario(): Promise<User | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

/**
 * Para route handlers del panel: lanza si no hay sesión. El middleware ya
 * bloquea la navegación, pero cada handler vuelve a validar: la seguridad no se
 * delega a una sola capa.
 */
export async function exigirAdmin(): Promise<SesionAdmin> {
  const usuario = await obtenerUsuario();
  if (!usuario) throw new ErrorNoAutorizado();
  return { usuario };
}
