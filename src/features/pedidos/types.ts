import type { Enums, Tables } from "@/lib/supabase/database.types";

export type Pedido = Tables<"pedido">;
export type PedidoItem = Tables<"pedido_item">;
export type Transaccion = Tables<"transaccion">;
export type EstadoPedido = Enums<"estado_pedido">;

export type PedidoCompleto = Pedido & {
  items: PedidoItem[];
  transacciones: Transaccion[];
};

/**
 * Espejo de la máquina de estados que vive en `transicionar_pedido()`. Sirve
 * para pintar la interfaz; la validación de verdad la hace la base.
 */
export const TRANSICIONES_PEDIDO: Record<EstadoPedido, readonly EstadoPedido[]> = {
  pendiente: ["pagado", "rechazado", "expirado"],
  pagado: ["preparando"],
  preparando: ["entregado", "cancelado"],
  rechazado: [],
  expirado: [],
  entregado: [],
  cancelado: [],
} as const;

/**
 * Efecto de cada transición sobre el inventario. Cancelar desde `preparando`
 * no repone nada: el uniforme ya lleva estampado personalizado.
 */
export const EFECTO_INVENTARIO: Partial<Record<EstadoPedido, "consumir" | "liberar">> = {
  pagado: "consumir",
  rechazado: "liberar",
  expirado: "liberar",
};

/**
 * Estados crudos que manda Wompi en `transaccion.estado`. La columna es `text`
 * sin CHECK para poder guardar un estado nuevo que Wompi agregue mañana.
 */
export const ESTADOS_WOMPI = ["APPROVED", "DECLINED", "VOIDED", "ERROR", "PENDING"] as const;
