import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { OPCION_TODOS_LOS_DEPORTES, type DeporteMuestra } from "@/features/cuenta/datos-de-muestra";
import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * Nombre de la cookie con el deporte activo del panel. Legible desde el
 * servidor en cualquier página del panel y del área de cuenta. Guarda el
 * `slug` del deporte (o "todos"), el mismo valor que ya guardaba cuando la
 * lista era de muestra: las cookies existentes siguen valiendo.
 */
export const NOMBRE_COOKIE_DEPORTE = "tsw.deporte";

/**
 * Lo que ve el selector del panel, leído de la tabla `deporte` (migración 22):
 * solo los deportes ACTIVOS, en el orden del panel, y al final "Marca TSW
 * (todos)". Un deporte desactivado no es un contexto en el que se administre:
 * se reactiva desde la pestaña Deportes de /admin/sitio, que sí lista todos.
 *
 * El filtro va en la consulta y no solo en RLS (la política con sesión de
 * administrador deja ver también los inactivos).
 *
 * `cache` = una sola consulta por petición: el layout y cada página piden
 * `deporteActivo()`. Si la lectura falla o no hay ningún deporte activo (la RPC
 * impide desactivar el último), queda solo "Marca TSW (todos)": mejor un
 * selector mínimo y cierto que uno con deportes de fábrica que no existen.
 */
export const listarOpcionesSelectorPanel = cache(async (): Promise<DeporteMuestra[]> => {
  try {
    const supabase = await crearClienteServidor();
    const { data, error } = await supabase
      .from("deporte")
      .select("slug, nombre")
      .eq("activo", true)
      .order("orden")
      .order("creado_en");

    if (error) {
      console.error("[deporte] no se pudo leer la tabla para el selector del panel:", error.message);
      return [OPCION_TODOS_LOS_DEPORTES];
    }

    return [...(data ?? []).map((d) => ({ id: d.slug, nombre: d.nombre })), OPCION_TODOS_LOS_DEPORTES];
  } catch (error) {
    console.error("[deporte] fallo inesperado leyendo el selector del panel:", error);
    return [OPCION_TODOS_LOS_DEPORTES];
  }
});

/**
 * Deporte activo según la cookie.
 *  · Sin cookie: el primer deporte activo (el punto de partida del panel).
 *  · Cookie con un id que ya no está en la lista —un deporte desactivado
 *    después de elegirlo, o un valor viejo o ajeno—: "Marca TSW (todos)", que
 *    siempre existe, en vez de saltar en silencio a otro deporte.
 */
export async function deporteActivo(): Promise<DeporteMuestra> {
  const guardado = (await cookies()).get(NOMBRE_COOKIE_DEPORTE)?.value;
  const opciones = await listarOpcionesSelectorPanel();

  if (guardado === undefined) return opciones[0]!;
  return opciones.find((o) => o.id === guardado) ?? OPCION_TODOS_LOS_DEPORTES;
}
