import type { Tables } from "@/lib/supabase/database.types";

export type Documento = Tables<"documento">;
export type DocumentoVersion = Tables<"documento_version">;

/**
 * Documento con su versión vigente, que es la que tiene `archivado_en` en NULL.
 * Es lo que consume la página pública de matrículas.
 */
export type DocumentoConVersion = Documento & {
  version_vigente: DocumentoVersion | null;
};

/** Bucket donde viven los PDF. */
export const BUCKET_DOCUMENTOS = "documentos-matricula";

/**
 * Ruta canónica de un archivo en Storage. La base valida este mismo formato
 * con un CHECK, así que armar la ruta por otro camino hace fallar el INSERT.
 */
export function rutaVersion(
  documentoId: string,
  version: number,
  nombreArchivo: string,
): string {
  return `documentos/${documentoId}/v${version}/${nombreArchivo}`;
}
