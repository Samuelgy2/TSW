import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import {
  OPCIONES_SELECTOR_PANEL,
  OPCION_TODOS_LOS_DEPORTES,
  type DeporteMuestra,
} from "@/features/cuenta/datos-de-muestra";
import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * Nombre de la cookie con el deporte activo del panel. Legible desde el
 * servidor en cualquier página del panel y del área de cuenta. Guarda el
 * `slug` del deporte (o "todos"), el mismo valor que ya guardaba cuando la
 * lista era de muestra: las cookies existentes siguen valiendo.
 */
export const NOMBRE_COOKIE_DEPORTE = "tsw.deporte";

export type OpcionPanel = DeporteMuestra & { activo: boolean };

/**
 * Lo que ve el selector del panel, leído de la tabla `deporte` (migración 22)
 * con la sesión del administrador: la política deja ver también los inactivos.
 *
 * Orden: activos, luego inactivos con la marca "· inactivo" en el nombre, y al
 * final "Marca TSW (todos)". Los inactivos SE MUESTRAN a propósito: si la
 * cookie apuntara a uno recién desactivado y desapareciera de la lista, el
 * panel caería en silencio a otro deporte sin que el administrador supiera por
 * qué, y no habría dónde reactivarlo desde su propia vista.
 *
 * `cache` = una sola consulta por petición: el layout y cada página piden
 * `deporteActivo()`. Si la lectura falla o la tabla viene vacía, el panel cae
 * a la lista de fábrica en vez de quedarse sin selector.
 */
export const listarOpcionesSelectorPanel = cache(async (): Promise<OpcionPanel[]> => {
  const respaldo = OPCIONES_SELECTOR_PANEL.map((o) => ({ ...o, activo: true }));
  try {
    const supabase = await crearClienteServidor();
    const { data, error } = await supabase
      .from("deporte")
      .select("slug, nombre, activo")
      .order("orden")
      .order("creado_en");

    if (error) {
      console.error("[deporte] no se pudo leer la tabla para el selector del panel:", error.message);
      return respaldo;
    }
    if (!data || data.length === 0) return respaldo;

    return [
      ...data.filter((d) => d.activo).map((d) => ({ id: d.slug, nombre: d.nombre, activo: true })),
      ...data
        .filter((d) => !d.activo)
        .map((d) => ({ id: d.slug, nombre: `${d.nombre} · inactivo`, activo: false })),
      { ...OPCION_TODOS_LOS_DEPORTES, activo: true },
    ];
  } catch (error) {
    console.error("[deporte] fallo inesperado leyendo el selector del panel:", error);
    return respaldo;
  }
});

/**
 * Deporte activo según la cookie. Si falta o trae un id desconocido, cae al
 * primer deporte activo. Acepta también la opción "todos" (marca TSW), que
 * solo existe en el panel.
 */
export async function deporteActivo(): Promise<OpcionPanel> {
  const guardado = (await cookies()).get(NOMBRE_COOKIE_DEPORTE)?.value;
  const opciones = await listarOpcionesSelectorPanel();
  return (
    opciones.find((o) => o.id === guardado) ??
    opciones.find((o) => o.activo && o.id !== OPCION_TODOS_LOS_DEPORTES.id) ??
    opciones[0]!
  );
}
