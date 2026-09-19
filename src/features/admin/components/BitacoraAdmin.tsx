"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Boton, Campo, Select, TablaResponsiva, type ColumnaTabla } from "@/components/ui";
import { formatearFechaHora } from "@/lib/utils";
import type { EventoAuditoria } from "../types";
import { ETIQUETA_ACCION, etiquetaEntidad } from "../types";

type Filtros = {
  entidad?: string;
  accion?: string;
  desde?: string;
  hasta?: string;
};

const ENTIDADES = [
  "documento",
  "documento_version",
  "producto",
  "variante",
  "competencia",
  "resultado",
  "nivel",
  "pedido",
  "pedido_item",
  "transaccion",
] as const;

const ACCIONES = ["crear", "actualizar", "eliminar", "publicar", "archivar", "cambiar_estado"] as const;

/**
 * Bitácora: solo lectura. La tabla crece sin parar, así que llega paginada
 * desde el servidor y la paginación viaja en la URL junto con los filtros.
 * Nada aquí escribe: ni siquiera existe una acción que lo permita.
 */
export function BitacoraAdmin({
  eventos,
  filtros,
  pagina,
  total,
  porPagina,
}: {
  eventos: EventoAuditoria[];
  filtros: Filtros;
  pagina: number;
  total: number;
  porPagina: number;
}) {
  const router = useRouter();
  const [expandido, setExpandido] = useState<string | null>(null);

  const paginas = Math.max(1, Math.ceil(total / porPagina));

  function navegar(paginaNueva: number) {
    const params = new URLSearchParams();
    if (filtros.entidad) params.set("entidad", filtros.entidad);
    if (filtros.accion) params.set("accion", filtros.accion);
    if (filtros.desde) params.set("desde", filtros.desde);
    if (filtros.hasta) params.set("hasta", filtros.hasta);
    if (paginaNueva > 1) params.set("pagina", String(paginaNueva));
    router.push(`/admin/bitacora${params.size ? `?${params.toString()}` : ""}`);
  }

  const columnas: ColumnaTabla<EventoAuditoria>[] = [
    {
      clave: "fecha",
      titulo: "Fecha",
      render: (e) => <time dateTime={e.ocurrido_en}>{formatearFechaHora(e.ocurrido_en)}</time>,
    },
    {
      clave: "accion",
      titulo: "Acción",
      principal: true,
      render: (e) => (
        <span className="block max-w-[24rem] lg:max-w-none">
          <span className="font-semibold">{ETIQUETA_ACCION[e.accion]}</span>{" "}
          <span className="text-sm font-normal text-texto-sec">{etiquetaEntidad(e.entidad).toLowerCase()}</span>
        </span>
      ),
    },
    {
      clave: "actor",
      titulo: "Actor",
      render: (e) => (
        <span className="whitespace-nowrap">
          {e.actor_id === null ? (
            <span className="text-texto-sec">Sistema</span>
          ) : (
            <span className="font-mono text-sm">{e.actor_id.slice(0, 8)}</span>
          )}
        </span>
      ),
    },
    {
      clave: "detalle",
      titulo: "Detalle",
      alinear: "derecha",
      render: (e) => (
        <button
          type="button"
          aria-expanded={expandido === e.id}
          onClick={() => setExpandido(expandido === e.id ? null : e.id)}
          className="min-h-[44px] rounded-md px-3 text-sm font-semibold text-azul-profundo underline-offset-4 hover:text-rojo hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
        >
          {expandido === e.id ? "Ocultar" : "Ver"}
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Filtros: entidad, acción y rango de fechas, todos en la URL. */}
      <form
        method="get"
        className="grid gap-3 rounded-lg border border-gris-borde bg-blanco p-4 sm:grid-cols-5"
        aria-label="Filtros de la bitácora"
      >
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-azul-profundo">
          Entidad
          <select
            name="entidad"
            defaultValue={filtros.entidad ?? ""}
            className="min-h-[44px] rounded-md border-2 border-gris-borde bg-blanco px-3 py-2 text-base font-normal text-azul-profundo"
          >
            <option value="">Todas</option>
            {ENTIDADES.map((entidad) => (
              <option key={entidad} value={entidad}>
                {etiquetaEntidad(entidad)}
              </option>
            ))}
          </select>
        </label>
        <Select
          etiqueta="Acción"
          name="accion"
          defaultValue={filtros.accion ?? ""}
          marcador="Todas"
          opciones={ACCIONES.map((a) => ({ valor: a, etiqueta: ETIQUETA_ACCION[a] }))}
        />
        <Campo etiqueta="Desde" type="date" name="desde" defaultValue={filtros.desde ?? ""} />
        <Campo etiqueta="Hasta" type="date" name="hasta" defaultValue={filtros.hasta ?? ""} />
        <div className="flex items-end">
          <button
            type="submit"
            className="min-h-[44px] w-full rounded-md border-2 border-azul-profundo px-4 font-semibold text-azul-profundo transition-colors hover:bg-azul-profundo hover:text-blanco focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
          >
            Aplicar filtros
          </button>
        </div>
      </form>

      <TablaResponsiva
        caption="Bitácora de auditoría"
        filas={eventos}
        claveFila={(e) => e.id}
        columnas={columnas}
      />

      {/* Detalle expandible: el antes y el después en bruto, sin los datos del
          comprador que el trigger ya recortó. */}
      {eventos.map((e) =>
        expandido === e.id ? (
          <DetalleEvento key={`detalle-${e.id}`} evento={e} alCerrar={() => setExpandido(null)} />
        ) : null,
      )}

      {eventos.length === 0 && (
        <p className="rounded-lg border-2 border-dashed border-gris-borde bg-blanco px-6 py-10 text-center text-texto-sec">
          No hay eventos con esos filtros.
        </p>
      )}

      {/* Paginación en servidor: esta tabla crece sin parar. */}
      {paginas > 1 && (
        <nav aria-label="Paginación de la bitácora" className="flex items-center justify-between gap-4">
          <Boton variante="secundario" tamano="sm" disabled={pagina <= 1} onClick={() => navegar(pagina - 1)}>
            ← Anterior
          </Boton>
          <p className="text-sm text-texto-sec">
            Página {pagina} de {paginas} · {total} eventos
          </p>
          <Boton variante="secundario" tamano="sm" disabled={pagina >= paginas} onClick={() => navegar(pagina + 1)}>
            Siguiente →
          </Boton>
        </nav>
      )}
    </div>
  );
}

function DetalleEvento({ evento, alCerrar }: { evento: EventoAuditoria; alCerrar: () => void }) {
  return (
    <div
      role="region"
      aria-label={`Detalle del evento del ${formatearFechaHora(evento.ocurrido_en)}`}
      className="rounded-lg border border-gris-borde bg-blanco p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 text-sm">
          <p>
            <span className="font-semibold text-azul-profundo">{ETIQUETA_ACCION[evento.accion]}</span>{" "}
            {etiquetaEntidad(evento.entidad).toLowerCase()} ·{" "}
            <span className="font-mono text-texto-sec">{evento.entidad_id.slice(0, 8)}</span>
          </p>
          <p className="mt-1 text-texto-sec">
            Actor:{" "}
            {evento.actor_id === null ? (
              "Sistema (cron o webhook, sin actor identificado)"
            ) : (
              <span className="font-mono">{evento.actor_id}</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={alCerrar}
          className="min-h-[44px] min-w-[44px] rounded-md px-2 text-2xl leading-none text-texto-sec hover:bg-gris-frio focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
        >
          <span aria-hidden="true">×</span>
          <span className="sr-only">Cerrar detalle</span>
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <JsonVolcado titulo="Antes" datos={evento.antes_json} />
        <JsonVolcado titulo="Después" datos={evento.despues_json} />
      </div>
    </div>
  );
}

function JsonVolcado({ titulo, datos }: { titulo: string; datos: unknown }) {
  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-texto-sec">{titulo}</h4>
      {datos === null || datos === undefined ? (
        <p className="mt-2 text-sm text-texto-sec">— vacío —</p>
      ) : (
        <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-azul-profundo p-3 font-mono text-xs leading-relaxed text-blanco/90">
          {JSON.stringify(datos, null, 2)}
        </pre>
      )}
    </div>
  );
}
