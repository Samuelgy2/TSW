"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { NOMBRE_COOKIE_DEPORTE, listarOpcionesSelectorPanel } from "@/features/cuenta/deporte-servidor";

/**
 * Acción de vista previa: fija la cookie tsw.deporte y revalida el panel.
 *
 * Vive aquí y no en features/admin/acciones.ts porque no es una operación de
 * administración: no escribe en la base ni pasa por RPC con p_actor_id; solo
 * guarda la preferencia visual.
 *
 * La validación es contra la tabla `deporte` (la misma lista que pinta el
 * selector): un id desconocido se ignora.
 */
export async function elegirDeporte(id: string): Promise<void> {
  const deporte = (await listarOpcionesSelectorPanel()).find((d) => d.id === id);
  if (!deporte) return;

  const cookie = await cookies();
  cookie.set(NOMBRE_COOKIE_DEPORTE, deporte.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/admin", "layout");
}
