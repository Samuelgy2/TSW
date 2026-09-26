import { urlPublicaStorage } from "@/lib/supabase/storage";

/** Bucket de las fotos que el panel sube desde /admin/sitio (migración 19). */
export const BUCKET_SITIO = "sitio";

/**
 * Resuelve el campo `imagen` de una sección a una URL que `<Image>` pueda usar.
 *
 * El campo puede traer dos cosas, y hay que distinguirlas:
 *   · un path local, `/imagenes/algo.jpg`, que es el valor de fábrica de
 *     config/contenido.ts y vive en /public;
 *   · una ruta de Storage, `sitio/<uuid>.jpg`, que deja `subirImagenSitio()`
 *     cuando el panel sube una foto nueva.
 *
 * Un path local empieza por `/`; una ruta de Storage, no. Con eso alcanza:
 * no hace falta guardar de cuál de los dos tipos es, el propio valor lo dice.
 */
export function resolverImagenSitio(imagen: string | null): string | null {
  if (imagen === null) return null;
  if (imagen.startsWith("/")) return imagen;
  return urlPublicaStorage(BUCKET_SITIO, imagen);
}
