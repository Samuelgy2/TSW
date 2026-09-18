import type { Enums, Tables } from "@/lib/supabase/database.types";

export type Competencia = Tables<"competencia">;
export type Resultado = Tables<"resultado">;
export type EstadoPublicacion = Enums<"estado_publicacion">;

export type CompetenciaConResultados = Competencia & {
  resultados: Resultado[];
};

/** Bucket de afiches y galerías. Contiene fotos de menores de edad. */
export const BUCKET_COMPETENCIAS = "competencias";
