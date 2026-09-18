import { crearClienteServidor } from "@/lib/supabase/server";
import type { Nivel } from "./types";

/** Semilleros y niveles activos, en el orden definido por el administrador. */
export async function listarNiveles(): Promise<Nivel[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("nivel")
    .select("*")
    .order("orden", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
