import { crearClienteServidor } from "@/lib/supabase/server";
import type { DocumentoConVersion } from "./types";

/**
 * Documentos activos con su versión vigente, para la página de matrículas.
 * RLS ya deja fuera los documentos inactivos y las versiones archivadas; los
 * filtros de aquí se repiten a propósito: la política no es la única defensa.
 */
export async function listarDocumentosPublicados(): Promise<DocumentoConVersion[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("documento")
    .select("*, documento_version(*)")
    .eq("activo", true)
    .is("documento_version.archivado_en", null)
    .order("orden", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((fila) => {
    const { documento_version: versiones, ...documento } = fila;
    return { ...documento, version_vigente: versiones[0] ?? null };
  });
}
