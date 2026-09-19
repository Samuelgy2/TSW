"use client";

import Link from "next/link";
import { useState } from "react";

import {
  Badge,
  Boton,
  Campo,
  ChipEstado,
  ETIQUETA_ESTADO_PEDIDO,
  Modal,
  TablaResponsiva,
  type ColumnaTabla,
} from "@/components/ui";
import { formatearFechaHora, formatearPrecio } from "@/lib/utils";
import type { EstadoPedido, PedidoCompleto } from "@/features/pedidos/types";
import { TransicionesPedido } from "./TransicionesPedido";

const ESTADOS_FILTRO: EstadoPedido[] = [
  "pendiente",
  "pagado",
  "preparando",
  "entregado",
  "rechazado",
  "expirado",
  "cancelado",
];

/**
 * Bandeja de pedidos. Reglas que la interfaz hace cumplir:
 *  · Solo se ofrecen las transiciones válidas desde el estado actual: no hay
 *    botones que la máquina de estados (transicionar_pedido) va a rechazar.
 *  · El panel no crea pedidos: los pedidos nacen del checkout, y ni aquí ni en
 *    el servidor existe la vía para crearlos.
 *  · Cancelar desde “preparando” abre un diálogo propio: el inventario NO se
 *    repone porque la prenda ya lleva estampado personalizado.
 */
export function PedidosAdmin({
  pedidos,
  filtros,
}: {
  pedidos: PedidoCompleto[];
  filtros: { estado?: string; desde?: string; hasta?: string };
}) {
  const [detalle, setDetalle] = useState<PedidoCompleto | null>(null);

  return (
    <div className="flex flex-col gap-6">

      {/* Filtros por estado y rango de fechas: viajan en la URL para que el
          listado siga siendo un Server Component. */}
      <form
        method="get"
        className="grid gap-3 rounded-lg border border-gris-borde bg-blanco p-4 sm:grid-cols-4"
        aria-label="Filtros de pedidos"
      >
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-azul-profundo">
          Estado
          <select
            name="estado"
            defaultValue={filtros.estado ?? ""}
            className="min-h-[44px] rounded-md border-2 border-gris-borde bg-blanco px-3 py-2 text-base font-normal text-azul-profundo"
          >
            <option value="">Todos</option>
            {ESTADOS_FILTRO.map((estado) => (
              <option key={estado} value={estado}>
                {ETIQUETA_ESTADO_PEDIDO[estado]}
              </option>
            ))}
          </select>
        </label>
        <Campo etiqueta="Desde" type="date" name="desde" defaultValue={filtros.desde ?? ""} />
        <Campo etiqueta="Hasta" type="date" name="hasta" defaultValue={filtros.hasta ?? ""} />
        <div className="flex items-end">
          <Boton type="submit" variante="secundario" completo>
            Aplicar filtros
          </Boton>
        </div>
      </form>

      <TablaResponsiva
        caption="Pedidos de la tienda"
        filas={pedidos}
        claveFila={(p) => p.id}
        columnas={[
          {
            clave: "referencia",
            titulo: "Referencia",
            principal: true,
            render: (p) => (
              <Link
                href={`/admin/pedidos/${p.id}`}
                className="font-mono text-sm underline-offset-4 hover:text-rojo hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
              >
                {p.referencia}
              </Link>
            ),
          },
          {
            clave: "fecha",
            titulo: "Fecha",
            render: (p) => <span className="whitespace-nowrap">{formatearFechaHora(p.creado_en)}</span>,
          },
          {
            clave: "comprador",
            titulo: "Comprador",
            render: (p) => (
              <span className="block max-w-[16rem]">
                {p.comprador_nombre}
                <span className="mt-0.5 block text-sm font-normal text-texto-sec">{p.comprador_email}</span>
              </span>
            ),
          },
          {
            clave: "total",
            titulo: "Total",
            alinear: "derecha",
            render: (p) => <span className="whitespace-nowrap font-semibold">{formatearPrecio(p.total_centavos)}</span>,
          },
          { clave: "estado", titulo: "Estado", render: (p) => <ChipEstado tipo="pedido" valor={p.estado} /> },
          {
            clave: "acciones",
            titulo: "Acciones",
            alinear: "derecha",
            render: (p) => (
              <Boton tamano="sm" variante="secundario" onClick={() => setDetalle(p)}>
                Ver detalle
              </Boton>
            ),
          },
        ] satisfies ColumnaTabla<PedidoCompleto>[]}
      />

      {pedidos.length === 0 && (
        <p className="rounded-lg border-2 border-dashed border-gris-borde bg-blanco px-6 py-10 text-center text-texto-sec">
          No hay pedidos con esos filtros. Los pedidos nacen del checkout de la tienda; aquí no se crean.
        </p>
      )}

      {detalle && <DetallePedido pedido={detalle} alCerrar={() => setDetalle(null)} />}
    </div>
  );
}

// --- Detalle -----------------------------------------------------------------

function DetallePedido({ pedido, alCerrar }: { pedido: PedidoCompleto; alCerrar: () => void }) {
  return (
    <Modal abierto alCerrar={alCerrar} titulo={`Pedido ${pedido.referencia}`} className="sm:max-w-2xl">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <ChipEstado tipo="pedido" valor={pedido.estado} />
          <span className="font-display text-xl text-azul-profundo">{formatearPrecio(pedido.total_centavos)}</span>
        </div>

        <section aria-label="Comprador" className="rounded-md border border-gris-borde p-4 text-sm">
          <p className="font-semibold text-azul-profundo">{pedido.comprador_nombre}</p>
          <p className="mt-1 text-texto-sec">{pedido.comprador_email}</p>
          <p className="text-texto-sec">{pedido.comprador_telefono}</p>
          {pedido.notas && <p className="mt-2 text-texto-sec">Notas: {pedido.notas}</p>}
          <p className="mt-2 text-texto-sec">
            Creado el {formatearFechaHora(pedido.creado_en)}
            {pedido.pagado_en && ` · Pagado el ${formatearFechaHora(pedido.pagado_en)}`}
          </p>
        </section>

        <section aria-label="Ítems del pedido">
          <h3 className="text-sm font-bold uppercase tracking-wide text-texto-sec">Ítems</h3>
          <ul className="mt-2 divide-y divide-gris-borde rounded-md border border-gris-borde">
            {pedido.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  <span className="font-semibold text-azul-profundo">{item.cantidad}×</span>{" "}
                  {item.nombre_producto} · talla {item.talla}
                </span>
                <span className="whitespace-nowrap font-semibold text-azul-profundo">
                  {formatearPrecio(item.cantidad * item.precio_unitario_centavos)}
                </span>
              </li>
            ))}
            {pedido.items.length === 0 && <li className="px-4 py-3 text-sm text-texto-sec">Sin líneas registradas.</li>}
          </ul>
        </section>

        <section aria-label="Pago">
          <h3 className="text-sm font-bold uppercase tracking-wide text-texto-sec">Transacción de Wompi</h3>
          {pedido.transacciones.length === 0 ? (
            <p className="mt-2 text-sm text-texto-sec">Todavía no llega ninguna transacción.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {pedido.transacciones.map((t) => (
                <li key={t.id} className="rounded-md border border-gris-borde p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono">{t.wompi_id}</span>
                    <Badge tono={t.estado === "APPROVED" ? "exito" : t.firma_valida ? "aviso" : "acento"}>
                      {t.estado}
                    </Badge>
                  </div>
                  <p className="mt-1 text-texto-sec">
                    {formatearPrecio(t.monto_centavos)}
                    {t.metodo_pago && ` · ${t.metodo_pago}`} · recibida el {formatearFechaHora(t.recibido_en)} ·{" "}
                    {t.firma_valida ? "firma válida" : "firma inválida"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Cambiar estado">
          <h3 className="text-sm font-bold uppercase tracking-wide text-texto-sec">Cambiar estado</h3>
          <div className="mt-2">
            <TransicionesPedido pedido={pedido} />
          </div>
        </section>
      </div>

      <PieDetalle alCerrar={alCerrar} />
    </Modal>
  );
}

function PieDetalle({ alCerrar }: { alCerrar: () => void }) {
  return (
    <div className="mt-2 flex justify-end border-t border-gris-borde p-5">
      <Boton variante="fantasma" onClick={alCerrar}>
        Cerrar
      </Boton>
    </div>
  );
}
