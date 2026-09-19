import type { Metadata } from "next";

import { PaginaPanel } from "@/components/admin/PaginaPanel";
import { SECCIONES_PANEL } from "@/config/panel";
import { exigirSesionPagina } from "@/lib/auth";
import type { EstadoPedido } from "@/features/pedidos/types";
import { PedidosAdmin } from "@/features/admin/components/PedidosAdmin";
import { listarPedidosPanel } from "@/features/admin/queries-pedidos";

export const metadata: Metadata = { title: "Pedidos" };

const SECCION = SECCIONES_PANEL.find((s) => s.href === "/admin/pedidos");

const ESTADOS: EstadoPedido[] = [
  "pendiente",
  "pagado",
  "rechazado",
  "expirado",
  "preparando",
  "entregado",
  "cancelado",
];

/** Pedidos de la tienda: bandeja con filtros y detalle por pedido. */
export default async function PaginaPedidosPanel({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; desde?: string; hasta?: string }>;
}) {
  await exigirSesionPagina("/admin/pedidos");

  const params = await searchParams;
  const estado = ESTADOS.find((e) => e === params.estado);
  const pedidos = await listarPedidosPanel({
    estado,
    desde: params.desde,
    hasta: params.hasta,
  });

  return (
    <PaginaPanel titulo="Pedidos" descripcion={SECCION?.descripcion}>
      <PedidosAdmin pedidos={pedidos} filtros={{ estado: params.estado, desde: params.desde, hasta: params.hasta }} />
    </PaginaPanel>
  );
}
