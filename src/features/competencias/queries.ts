import { crearClienteServidor } from "@/lib/supabase/server";
import { ErrorNoEncontrado } from "@/lib/errors";
import type { Competencia, CompetenciaConResultados } from "./types";

/**
 * Calendario público, de la más reciente a la más antigua. RLS ya deja fuera
 * borradores y archivadas; el filtro se repite para no depender solo de ella.
 */
export async function listarCompetencias(): Promise<Competencia[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("competencia")
    .select("*")
    .eq("estado", "publicado")
    .order("fecha", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** La competencia destacada, con sus resultados. Solo puede haber una. */
export async function obtenerCompetenciaDestacada(): Promise<CompetenciaConResultados | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("competencia")
    .select("*, resultado(*)")
    .eq("destacado", true)
    .eq("estado", "publicado")
    .order("puesto", { referencedTable: "resultado", ascending: true })
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { resultado, ...competencia } = data;
  return { ...competencia, resultados: resultado };
}

export async function obtenerCompetenciaPorSlug(
  slug: string,
): Promise<CompetenciaConResultados> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("competencia")
    .select("*, resultado(*)")
    .eq("slug", slug)
    .eq("estado", "publicado")
    .order("puesto", { referencedTable: "resultado", ascending: true })
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new ErrorNoEncontrado("Esa competencia no existe o no está publicada.");

  const { resultado, ...competencia } = data;
  return { ...competencia, resultados: resultado };
}

/**
 * Competencias publicadas con sus resultados, para el bloque de la portada y
 * para la página de competencias. RLS ya deja fuera borradores y archivadas.
 */
export async function listarCompetenciasConResultados(): Promise<CompetenciaConResultados[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("competencia")
    .select("*, resultado(*)")
    .eq("estado", "publicado")
    .order("fecha", { ascending: false })
    .order("puesto", { referencedTable: "resultado", ascending: true });

  if (error) throw error;

  return (data ?? []).map(({ resultado, ...competencia }) => ({
    ...competencia,
    resultados: resultado,
  }));
}

/** Años con competencias publicadas, del más reciente al más antiguo. */
export function aniosDisponibles(competencias: Competencia[]): number[] {
  const anios = new Set(competencias.map((c) => Number(c.fecha.slice(0, 4))));
  return [...anios].sort((a, b) => b - a);
}
