import type { Metadata } from "next";

import { PaginaPanel } from "@/components/admin/PaginaPanel";
import { Badge, Boton, ChipEstado } from "@/components/ui";
import { formatearFechaHora, formatearPrecio } from "@/lib/utils";
import { exigirSesionPagina } from "@/lib/auth";
import { TransicionesPedido } from "@/features/admin/components/TransicionesPedido";
import { eventosDelPedido, obtenerPedidoPanel } from "@/features/admin/queries-pedidos";
import { ETIQUETA_ACCION, etiquetaEntidad } from "@/features/admin/types";

export const metadata: Metadata = { title: "Detalle de pedido" };

/**
 * Detalle de un pedido en ruta propia: ítems, transacción de Wompi, línea de
 * tiempo de la bitácora y las transiciones válidas desde el estado actual.
 * La advertencia de cancelación desde “preparando” vive en el módulo cliente;
 * aquí el botón de cancelar lleva la misma regla: pasa por transicionar_pedido,
 * que es quien valida de verdad.
 */
export default async function PaginaPedidoDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirSesionPagina("/admin/pedidos");

  const pedido = await obtenerPedidoPanel(id);
  const eventos = await eventosDelPedido(pedido.id);

  return (
    <PaginaPanel
      titulo={`Pedido ${pedido.referencia}`}
      descripcion={`Creado el ${formatearFechaHora(pedido.creado_en)} · ${formatearPrecio(pedido.total_centavos)}`}
      accion={
        <Boton href="/admin/pedidos" variante="secundario">
          ← Volver a pedidos
        </Boton>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <ChipEstado tipo="pedido" valor={pedido.estado} />
          {pedido.pagado_en && (
            <span className="text-sm text-texto-sec">Pagado el {formatearFechaHora(pedido.pagado_en)}</span>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-label="Comprador" className="rounded-lg border border-gris-borde bg-blanco p-5 text-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-texto-sec">Comprador</h2>
            <p className="mt-2 font-semibold text-azul-profundo">{pedido.comprador_nombre}</p>
            <p className="mt-1 text-texto-sec">{pedido.comprador_email}</p>
            <p className="text-texto-sec">{pedido.comprador_telefono}</p>
            {pedido.notas && <p className="mt-2 text-texto-sec">Notas: {pedido.notas}</p>}
          </section>

          <section aria-label="Transacción de Wompi" className="rounded-lg border border-gris-borde bg-blanco p-5 text-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-texto-sec">Transacción de Wompi</h2>
            {pedido.transacciones.length === 0 ? (
              <p className="mt-2 text-texto-sec">Todavía no llega ninguna transacción.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-3">
                {pedido.transacciones.map((t) => (
                  <li key={t.id} className="rounded-md border border-gris-borde p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono">{t.wompi_id}</span>
                      <Badge tono={t.estado === "APPROVED" ? "exito" : t.firma_valida ? "aviso" : "acento"}>
                        {t.estado}
                      </Badge>
                    </div>
                    <p className="mt-1 text-texto-sec">
                      {formatearPrecio(t.monto_centavos)}
                      {t.metodo_pago && ` · ${t.metodo_pago}`} · {formatearFechaHora(t.recibido_en)} ·{" "}
                      {t.firma_valida ? "firma válida" : "firma inválida"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section aria-label="Ítems del pedido">
          <h2 className="text-sm font-bold uppercase tracking-wide text-texto-sec">Ítems</h2>
          <ul className="mt-2 divide-y divide-gris-borde rounded-lg border border-gris-borde bg-blanco">
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
            {pedido.items.length === 0 && (
              <li className="px-4 py-3 text-sm text-texto-sec">Sin líneas registradas.</li>
            )}
          </ul>
        </section>

        <section aria-label="Cambiar estado">
          <h2 className="text-sm font-bold uppercase tracking-wide text-texto-sec">Cambiar estado</h2>
          <div className="mt-2 rounded-lg border border-gris-borde bg-blanco p-5">
            <TransicionesPedido pedido={pedido} etiqueta="md" />
          </div>
        </section>

        <section aria-label="Línea de tiempo del pedido">
          <h2 className="text-sm font-bold uppercase tracking-wide text-texto-sec">Línea de tiempo</h2>
          <ol className="mt-2 divide-y divide-gris-borde rounded-lg border border-gris-borde bg-blanco">
            {eventos.map((e) => (
              <li key={e.id} className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:justify-between">
                <span>
                  <span className="font-semibold text-azul-profundo">{ETIQUETA_ACCION[e.accion]}</span>{" "}
                  {etiquetaEntidad(e.entidad).toLowerCase()}
                </span>
                <span className="text-texto-sec">{formatearFechaHora(e.ocurrido_en)}</span>
              </li>
            ))}
            {eventos.length === 0 && (
              <li className="px-4 py-3 text-sm text-texto-sec">Sin eventos registrados todavía.</li>
            )}
          </ol>
        </section>
      </div>
    </PaginaPanel>
  );
}
