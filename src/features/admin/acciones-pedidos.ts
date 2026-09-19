"use server";

import { revalidatePath } from "next/cache";

import { ErrorApp } from "@/lib/errors";
import { ejecutarRpc } from "./mutations";
import { esquemaTransicionPedido } from "./schemas";

/** Resultado de una acción de escritura cuando no redirige. */
export type ResultadoEscritura = { ok: true; mensaje?: string } | { ok: false; error: string };

function mensajeDe(error: unknown): string {
  if (error instanceof ErrorApp) return error.message;
  console.error("[acciones pedidos]", error);
  return "No se pudo actualizar el pedido. Inténtalo de nuevo en un momento.";
}

/**
 * Cambiar el estado de un pedido. La única escritura del panel sobre pedidos:
 * pasa por transicionar_pedido(), que valida la máquina de estados, mueve el
 * inventario (consumir al pagar, liberar al rechazar o expirar) y registra el
 * actor en la bitácora.
 *
 * Lo que la interfaz no ofrece, aquí tampoco se acepta de más: la base es la
 * que dice no, y sus mensajes ya llegan traducidos por ejecutarRpc.
 */
export async function transicionarPedido(id: string, nuevoEstado: string): Promise<ResultadoEscritura> {
  const datos = esquemaTransicionPedido.safeParse({ id, nuevoEstado });
  if (!datos.success) {
    return { ok: false, error: datos.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    const pedido = await ejecutarRpc("transicionar_pedido", {
      p_pedido_id: datos.data.id,
      p_nuevo_estado: datos.data.nuevoEstado,
    });

    // Los pedidos no alimentan rutas públicas (RLS lo impide para el anónimo),
    // pero el detalle del panel y la bandeja sí se refrescan.
    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${datos.data.id}`);
    revalidatePath("/admin");

    return { ok: true, mensaje: `Pedido actualizado a “${pedido.estado}”.` };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}
