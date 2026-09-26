import type { Deporte } from "@/config/contenido";

/**
 * Deporte por id, con el primero como respaldo.
 *
 * Recibe la lista en vez de importar `DEPORTES` de `config/contenido.ts`:
 * desde la migración 19 esa lista puede estar personalizada en
 * `contenido_sitio`, y quien llama ya la obtuvo con
 * `obtenerDeportes()` (features/sitio/queries.ts), que sabe caer al valor de
 * fábrica si hace falta. Esta función se queda pura y no vuelve a leer nada.
 */
export function deportePublicoPorId(id: string | undefined, deportes: readonly Deporte[]): Deporte {
  return deportes.find((d) => d.id === id) ?? deportes[0]!;
}

/**
 * El selector de deporte del sitio público se oculta hasta que exista la
 * tabla `deporte` y las consultas filtren por ella. Hoy no filtra nada y su
 * segunda opción es un marcador ("[DEPORTE 2]"). Se enciende aquí cuando
 * llegue el esquema; el resto del recorrido por deporte no cambia.
 */
export const SELECTOR_DEPORTE_PUBLICO_VISIBLE = false;

/** Nombre del parámetro de búsqueda con el deporte en el sitio público. */
export const PARAMETRO_DEPORTE = "deporte";

export type ParametrosBusqueda = Record<string, string | string[] | undefined>;

/**
 * Deporte activo de una página pública a partir de `?deporte=<id>`.
 *
 * Decisión: parámetro de búsqueda y no segmento de ruta (`/bmx/competencias`).
 * Mientras no exista la tabla deporte, las rutas existentes se quedan como
 * están, `revalidatePath` sigue apuntando a las mismas páginas y no hay que
 * duplicar `loading.tsx` y `error.tsx` por deporte. Cuando el esquema llegue
 * y cada deporte tenga contenido propio indexable, se evalúa pasar a segmento;
 * el cambio es de esta función y de los enlaces, no de las páginas.
 *
 * Un id desconocido o ausente cae al primer deporte de la lista.
 */
export function deporteDeParametros(
  parametros: ParametrosBusqueda | undefined,
  deportes: readonly Deporte[],
): Deporte {
  const crudo = parametros?.[PARAMETRO_DEPORTE];
  const id = Array.isArray(crudo) ? crudo[0] : crudo;
  return deportePublicoPorId(id, deportes);
}

/** Enlace a una sección pública con el deporte ya puesto. */
export function enlaceConDeporte(ruta: string, deporteId: string): string {
  return `${ruta}?${PARAMETRO_DEPORTE}=${encodeURIComponent(deporteId)}`;
}
