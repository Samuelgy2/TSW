import { crearClientePublico } from "@/lib/supabase/publico";
import type { SlideCarrusel } from "./types";

/**
 * Diapositivas activas del carrusel de la portada, en su orden. Lectura
 * pública con anon key, igual que el resto de las consultas de la portada:
 * la política `carrusel_slide_lectura_publica` (migración 21) ya filtra por
 * `activo`, pero se repite aquí en la consulta y no solo en RLS (regla del
 * proyecto: la política nunca es la única defensa).
 */
export async function listarSlidesCarrusel(): Promise<SlideCarrusel[]> {
  const supabase = crearClientePublico();
  const { data, error } = await supabase
    .from("carrusel_slide")
    .select("*")
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (error) {
    // Igual que club-publico: un fallo aquí no puede tumbar la portada entera.
    console.error("[carrusel] error al leer carrusel_slide, se muestra sin carrusel:", error.message);
    return [];
  }
  return data ?? [];
}
