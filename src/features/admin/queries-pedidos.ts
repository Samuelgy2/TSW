import { crearClienteServidor } from "@/lib/supabase/server";
import { exigirAdmin } from "@/lib/auth";
import { ErrorNoEncontrado } from "@/lib/errors";
import type { EstadoPedido, PedidoCompleto } from "@/features/pedidos/types";

/**
 * Lecturas de pedidos para el panel (bloque C). `pedido`, `pedido_item` y
 * `transaccion` no tienen lectura anónima en RLS: solo la sesión del
 * administrador las consulta, verificada en cada función con exigirAdmin().
 *
 * La escritura no vive aquí: los pedidos pasan por transicionar_pedido(),
 * la RPC que valida la máquina de estados (acciones-pedidos.ts).
 */

export type FiltrosPedidos = {
  estado?: EstadoPedido;
  /** ISO: solo fechas, no timestamps. */
  desde?: string;
  hasta?: string;
};

function limpiar(valor: string | undefined): string | undefined {
  const texto = valor?.trim();
  return texto ? texto : undefined;
}

const ESTADOS_VALIDOS = [
  "pendiente",
  "pagado",
  "rechazado",
  "expirado",
  "preparando",
  "entregado",
  "cancelado",
] as const;

/**
 * Bandeja de pedidos: filtro por estado y por rango de fechas, del más
 * reciente al más viejo. El estado llega como texto de la URL; si no es un
 * estado válido, no filtra (más barato que un error para un valor imposible).
 */
export async function listarPedidosPanel(filtros: FiltrosPedidos = {}): Promise<PedidoCompleto[]> {
  await exigirAdmin();

  const supabase = await crearClienteServidor();

  let consulta = supabase
    .from("pedido")
    .select("*, pedido_item(*), transaccion(*)")
    .order("creado_en", { ascending: false });

  const estado = ESTADOS_VALIDOS.find((e) => e === filtros.estado);
  if (estado) consulta = consulta.eq("estado", estado);

  const desde = limpiar(filtros.desde);
  const hasta = limpiar(filtros.hasta);
  if (desde) consulta = consulta.gte("creado_en", `${desde}T00:00:00Z`);
  if (hasta) consulta = consulta.lte("creado_en", `${hasta}T23:59:59Z`);

  const { data, error } = await consulta;
  if (error) throw error;

  return (data ?? []).map(({ pedido_item, transaccion, ...pedido }) => ({
    ...pedido,
    items: pedido_item ?? [],
    transacciones: transaccion ?? [],
  }));
}

/** Un pedido con sus ítems y transacciones, para el detalle. */
export async function obtenerPedidoPanel(id: string): Promise<PedidoCompleto> {
  await exigirAdmin();

  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ErrorNoEncontrado("Ese pedido no existe.");

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("pedido")
    .select("*, pedido_item(*), transaccion(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new ErrorNoEncontrado("Ese pedido no existe.");

  const { pedido_item, transaccion, ...pedido } = data;
  return { ...pedido, items: pedido_item ?? [], transacciones: transaccion ?? [] };
}

/**
 * Línea de tiempo del pedido: sus eventos en la bitácora, del más viejo al
 * más nuevo. Es lo que reconstruye qué le pasó al pedido sin salir del panel.
 */
export async function eventosDelPedido(pedidoId: string): Promise<
  Awaited<ReturnType<typeof import("./queries").listarAuditoria>>
> {
  await exigirAdmin();

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("evento_auditoria")
    .select("*")
    .eq("entidad_id", pedidoId)
    .order("ocurrido_en", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
