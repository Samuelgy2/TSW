import type { MetadataRoute } from "next";

import { LEGALES_APROBADAS, URL_SITIO } from "@/config/sitio";
import { listarClubes } from "@/features/clubes/queries";
import { listarProductos } from "@/features/tienda/queries";

/** Se regenera cada hora: un club o producto nuevo entra sin esperar un despliegue. */
export const revalidate = 3600;

const RUTAS_ESTATICAS = ["/", "/competencias", "/matriculas", "/tienda"];
/** Mientras no estén aprobadas llevan `noindex` (plantilla.tsx): no se anuncian. */
const RUTAS_LEGALES = ["/legal/datos", "/legal/terminos", "/legal/devoluciones"];

/**
 * Las dinámicas salen de la base con la anon key (RLS deja solo lo activo; las
 * consultas lo repiten). Si la lectura falla —sin red, variables ausentes en el
 * build— se devuelven las estáticas: un sitemap incompleto es mejor que un
 * build roto.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const estaticas = [...RUTAS_ESTATICAS, ...(LEGALES_APROBADAS ? RUTAS_LEGALES : [])].map((ruta) => ({
    url: `${URL_SITIO}${ruta}`,
  }));

  try {
    const [clubes, productos] = await Promise.all([listarClubes(), listarProductos()]);
    return [
      ...estaticas,
      ...clubes.map((c) => ({
        url: `${URL_SITIO}/semilleros/${encodeURIComponent(c.slug)}`,
        lastModified: c.actualizado_en,
      })),
      ...productos
        .filter((p) => p.activo)
        .map((p) => ({ url: `${URL_SITIO}/tienda/${encodeURIComponent(p.slug)}`, lastModified: p.actualizado_en })),
    ];
  } catch (error) {
    console.error("[sitemap] sin rutas dinámicas:", error instanceof Error ? error.message : error);
    return estaticas;
  }
}
