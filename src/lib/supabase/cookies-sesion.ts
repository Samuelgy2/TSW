/**
 * Las cookies de sesión de Supabase salen con `maxAge` de 400 días, así que
 * cerrar el navegador no cerraba la sesión: al volver a abrirlo seguía
 * iniciada. Se les quita `maxAge`/`expires` para que sean cookies de sesión del
 * navegador y mueran con él.
 *
 * Las cookies que se están BORRANDO (valor vacío o `maxAge: 0`) se dejan tal
 * cual: sin su `maxAge: 0` el cierre de sesión no borraría nada.
 *
 * Sin `server-only`: lo usan el middleware, el servidor y el cliente de navegador.
 */
export function comoCookieDeSesion<T extends { maxAge?: number; expires?: Date }>(options: T, value: string): T {
  if (value === "" || options.maxAge === 0) return options;
  const copia = { ...options };
  delete copia.maxAge;
  delete copia.expires;
  return copia;
}
