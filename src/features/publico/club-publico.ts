import type { Club } from "@/features/clubes/types";

/**
 * El club activo de una página pública, a partir del segmento de ruta
 * `/semilleros/<slug>`.
 *
 * Antes era `?club=<slug>`. Pasó a ruta porque cada club tiene contenido propio
 * que vale indexar aparte (title, description y canonical propios) y porque la
 * página puede generarse estática. `/semilleros?club=<slug>` sigue vivo como
 * redirección 301 en el middleware.
 *
 * Se usa el SLUG y no el id: sale en la URL, y un uuid ahí no le dice nada a
 * nadie ni sobrevive a una exportación de datos.
 */

/**
 * El club por defecto: el primero de `tipo = "club"` por orden.
 *
 * Por orden y no por un slug escrito aquí, porque el orden lo decide el
 * administrador desde el panel. Y filtrando por tipo, porque "el primero de la
 * lista" podría acabar siendo un PROGRAMA si alguien reordena: la página de
 * niveles abriría en Habilidades Motrices, que no tiene niveles y el visitante
 * vería un bloque de texto donde esperaba la ruta formativa.
 *
 * Si no hay ningún club activo se cae al primer registro que haya, sea
 * programa o lo que sea: enseñar el programa es mejor que no enseñar nada.
 * Con la lista vacía devuelve null y la página muestra su estado vacío.
 */
export function clubPorDefecto(clubes: Club[]): Club | null {
  return clubes.find((c) => c.tipo === "club") ?? clubes[0] ?? null;
}

/** El club activo con ese slug, o null: un slug desconocido es un 404, no un club "parecido". */
export function clubDeSlug(clubes: Club[], slug: string): Club | null {
  return clubes.find((c) => c.slug === slug) ?? null;
}
