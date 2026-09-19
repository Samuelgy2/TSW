import { entornoSupabase } from "./env";

/**
 * URL pública de un objeto de Storage. Los tres buckets del sitio son
 * públicos y se sirven por CDN, así que no hace falta cliente ni firma:
 * es una URL determinista a partir del bucket y la ruta.
 */
export function urlPublicaStorage(bucket: string, ruta: string): string {
  const segmentos = ruta.split("/").map(encodeURIComponent).join("/");
  return `${entornoSupabase.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${segmentos}`;
}
