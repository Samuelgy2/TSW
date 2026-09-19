"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Aviso, Boton, Modal } from "@/components/ui";
import type { EstadoPedido, PedidoCompleto } from "@/features/pedidos/types";
import { EFECTO_INVENTARIO, TRANSICIONES_PEDIDO } from "@/features/pedidos/types";
import { transicionarPedido } from "../acciones-pedidos";

type ResultadoAccion = { ok: boolean; error?: string; mensaje?: string };

/**
 * Botones de cambio de estado de un pedido. Ofrece únicamente las transiciones
 * válidas desde el estado actual —el espejo de la máquina que vive en
 * transicionar_pedido()— y se usa tanto en la bandeja como en el detalle.
 *
 * Cancelar desde “preparando” abre un diálogo de confirmación propio: el
 * inventario NO se repone porque la prenda ya lleva estampado personalizado,
 * y esa decisión no puede tomarse por accidente.
 */
export function TransicionesPedido({ pedido, etiqueta = "sm" }: { pedido: PedidoCompleto; etiqueta?: "sm" | "md" }) {
  const router = useRouter();
  const [aviso, setAviso] = useState<ResultadoAccion | null>(null);
  const [enCurso, setEnCurso] = useState<EstadoPedido | null>(null);
  const [cancelacion, setCancelacion] = useState<EstadoPedido | null>(null);

  const transiciones = TRANSICIONES_PEDIDO[pedido.estado] ?? [];
  if (transiciones.length === 0) {
    return <p className="text-sm text-texto-sec">Este pedido está en un estado terminal: ya no admite cambios.</p>;
  }

  async function mover(destino: EstadoPedido) {
    if (pedido.estado === "preparando" && destino === "cancelado") {
      setCancelacion(destino);
      return;
    }
    setEnCurso(destino);
    const resultado = await transicionarPedido(pedido.id, destino);
    setEnCurso(null);
    setAviso(resultado);
    if (resultado.ok) router.refresh();
  }

  async function confirmarCancelacion() {
    if (!cancelacion) return;
    setEnCurso(cancelacion);
    const resultado = await transicionarPedido(pedido.id, cancelacion);
    setEnCurso(null);
    setCancelacion(null);
    setAviso(resultado);
    if (resultado.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {transiciones.map((destino) => (
          <Boton
            key={destino}
            tamano={etiqueta}
            variante={destino === "cancelado" || destino === "rechazado" ? "secundario" : "primario"}
            cargando={enCurso === destino}
            disabled={enCurso !== null}
            onClick={() => void mover(destino)}
          >
            {destino === "pagado" && "Marcar como pagado"}
            {destino === "rechazado" && "Marcar como rechazado"}
            {destino === "expirado" && "Marcar como expirado"}
            {destino === "preparando" && "Pasar a preparación"}
            {destino === "entregado" && "Marcar como entregado"}
            {destino === "cancelado" && "Cancelar pedido"}
          </Boton>
        ))}
      </div>

      {transiciones.map((d) => EFECTO_INVENTARIO[d]).includes("consumir") && (
        <Aviso tono="info">Al marcar como pagado se consumen las reservas de inventario.</Aviso>
      )}
      {transiciones.map((d) => EFECTO_INVENTARIO[d]).includes("liberar") && (
        <Aviso tono="info">Al rechazar o expirar se liberan las reservas de inventario.</Aviso>
      )}

      {aviso?.error && <Aviso tono="error">{aviso.error}</Aviso>}
      {aviso?.ok && aviso.mensaje && <Aviso tono="exito">{aviso.mensaje}</Aviso>}

      <Modal
        abierto={cancelacion !== null}
        alCerrar={() => setCancelacion(null)}
        titulo="¿Cancelar este pedido?"
        pie={
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Boton variante="fantasma" onClick={() => setCancelacion(null)} disabled={enCurso !== null}>
              No, volver
            </Boton>
            <Boton cargando={enCurso === "cancelado"} onClick={() => void confirmarCancelacion()}>
              Sí, cancelar pedido
            </Boton>
          </div>
        }
      >
        <Aviso tono="aviso" titulo="El inventario no se repone">
          La prenda de este pedido ya lleva estampado personalizado: las unidades quedan consumidas y{" "}
          <strong>no vuelven al stock</strong>. Es una pérdida real para la escuela, no un ajuste contable.
        </Aviso>
        <p className="mt-3 text-texto-sec">
          El pedido <span className="font-mono font-semibold text-azul-profundo">{pedido.referencia}</span> pasará a
          estado <strong className="text-azul-profundo">cancelado</strong> y el comprador perderá su reserva. Esta
          decisión no se puede deshacer.
        </p>
      </Modal>
    </div>
  );
}
