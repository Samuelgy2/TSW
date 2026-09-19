import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { crearClienteServidor } from "@/lib/supabase/server";
import { ErrorNoAutorizado } from "@/lib/errors";
import { RUTA_LOGIN, RUTA_PANEL, esRutaAdminPublica } from "./rutas";

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
 * Para Server Actions y route handlers del panel: lanza si no hay sesión. El
 * middleware ya bloquea la navegación, pero cada punto de acceso vuelve a
 * validar: la seguridad no se delega a una sola capa.
 */
export async function exigirAdmin(): Promise<SesionAdmin> {
  const usuario = await obtenerUsuario();
  if (!usuario) throw new ErrorNoAutorizado();
  return { usuario };
}

/**
 * Para páginas y layouts del panel: sin sesión, redirige al acceso guardando
 * la ruta de destino. Se llama en cada página, no solo en el layout: Next no
 * vuelve a ejecutar el layout al navegar entre páginas hermanas.
 */
export async function exigirSesionPagina(destino: string): Promise<SesionAdmin> {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect(`${RUTA_LOGIN}?redirigir=${encodeURIComponent(destino)}`);
  return { usuario };
}

/**
 * Destino seguro tras el acceso: solo rutas relativas dentro del panel. Un
 * `redirigir` con dominio externo o con `//` sería una redirección abierta.
 */
export function destinoSeguro(redirigir: string | null | undefined): string {
  if (!redirigir) return RUTA_PANEL;
  if (!redirigir.startsWith("/admin") || redirigir.startsWith("//")) return RUTA_PANEL;
  if (esRutaAdminPublica(redirigir)) return RUTA_PANEL;
  return redirigir;
}
