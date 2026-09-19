/**
 * Rutas del panel. Sin `server-only`: las lee también el middleware, que corre
 * en el runtime edge y no puede importar `next/headers`.
 */

/** Página de acceso al panel. */
export const RUTA_LOGIN = "/admin/login";
/** A dónde se entra tras iniciar sesión si no había destino guardado. */
export const RUTA_PANEL = "/admin";

/**
 * Rutas bajo /admin que no exigen sesión: el acceso, la recuperación de
 * contraseña y el retorno del enlace de recuperación.
 */
export const RUTAS_ADMIN_PUBLICAS = [RUTA_LOGIN, "/admin/recuperar", "/admin/auth/"] as const;

export function esRutaAdminPublica(ruta: string): boolean {
  return RUTAS_ADMIN_PUBLICAS.some((publica) =>
    publica.endsWith("/") ? ruta.startsWith(publica) : ruta === publica,
  );
}
