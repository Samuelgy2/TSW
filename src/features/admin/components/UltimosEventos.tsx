import { formatearFechaHora } from "@/lib/utils";
import { ETIQUETA_ACCION, etiquetaEntidad, type EventoAuditoria } from "../types";

type Actor = { id: string; correo: string };

/** Nombre corto del registro afectado, sacado del JSON de después (o de antes). */
function nombreDe(evento: EventoAuditoria): string | null {
  const fila = (evento.despues_json ?? evento.antes_json) as Record<string, unknown> | null;
  if (!fila) return null;
  for (const clave of ["titulo", "nombre", "referencia", "rider", "talla", "nombre_archivo"]) {
    const valor = fila[clave];
    if (typeof valor === "string" && valor) return valor;
  }
  return null;
}

/**
 * Lista compacta de eventos de la bitácora, para el inicio del panel. El
 * único actor posible es el administrador; un actor nulo significa que la
 * escritura no pasó por una RPC (webhook de Wompi, cron o un UPDATE directo).
 */
export function UltimosEventos({ eventos, actorActual }: { eventos: EventoAuditoria[]; actorActual: Actor }) {
  return (
    <ol className="divide-y divide-gris-borde rounded-lg border border-gris-borde bg-blanco">
      {eventos.map((evento) => {
        const nombre = nombreDe(evento);
        const actor =
          evento.actor_id === null
            ? "Sistema"
            : evento.actor_id === actorActual.id
              ? actorActual.correo
              : `Usuario ${evento.actor_id.slice(0, 8)}`;
        return (
          <li key={evento.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <p className="min-w-0">
              <span className="font-semibold text-azul-profundo">{ETIQUETA_ACCION[evento.accion]}</span>{" "}
              <span className="text-texto-sec">{etiquetaEntidad(evento.entidad).toLowerCase()}</span>
              {nombre && <span className="text-azul-profundo"> · {nombre}</span>}
            </p>
            <p className="shrink-0 text-sm text-texto-sec">
              <time dateTime={evento.ocurrido_en}>{formatearFechaHora(evento.ocurrido_en)}</time>
              <span aria-hidden="true"> · </span>
              <span>{actor}</span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}
