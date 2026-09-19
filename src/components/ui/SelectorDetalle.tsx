"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

import { IndicadorActivo, motion, useMovimientoReducido } from "@/lib/animaciones";
import { cn } from "@/lib/utils";
import { Acordeon } from "./Acordeon";

export type ItemSelectorDetalle = {
  id: string;
  titulo: string;
  /** Línea corta bajo el título en la lista: edades, duración, "Paso 2". */
  resumen?: string;
  /** Número o etiqueta grande a la izquierda: "01", "02". */
  numero?: string;
  contenido: ReactNode;
};

export type SelectorDetalleProps = {
  items: ItemSelectorDetalle[];
  /** Nombre del grupo para lectores de pantalla. */
  etiqueta: string;
  /** Id abierto al montar. Por defecto, el primero. */
  inicial?: string;
  className?: string;
};

/**
 * Lista seleccionable a la izquierda y panel de detalle a la derecha.
 *
 * Desde `lg` es un `tablist` vertical con foco itinerante (flechas arriba y
 * abajo, Inicio, Fin). Por debajo, el mismo contenido se muestra como
 * acordeón exclusivo: a 360px no hay ancho para dos columnas, y un panel que
 * cambia fuera de la vista no se entiende. Los dos árboles existen siempre;
 * la media query decide cuál se ve, así no hay desajuste de hidratación.
 */
export function SelectorDetalle({ items, etiqueta, inicial, className }: SelectorDetalleProps) {
  const base = useId();
  const reducido = useMovimientoReducido();
  const [activoId, setActivoId] = useState(inicial ?? items[0]?.id ?? "");
  const indice = Math.max(
    0,
    items.findIndex((item) => item.id === activoId),
  );
  const activo = items[indice];

  function alTeclear(evento: KeyboardEvent<HTMLDivElement>) {
    let siguiente = indice;
    if (evento.key === "ArrowDown" || evento.key === "ArrowRight") siguiente = (indice + 1) % items.length;
    else if (evento.key === "ArrowUp" || evento.key === "ArrowLeft") siguiente = (indice - 1 + items.length) % items.length;
    else if (evento.key === "Home") siguiente = 0;
    else if (evento.key === "End") siguiente = items.length - 1;
    else return;

    evento.preventDefault();
    const destino = items[siguiente];
    if (!destino) return;
    setActivoId(destino.id);
    document.getElementById(`${base}-tab-${destino.id}`)?.focus();
  }

  if (!activo) return null;

  return (
    <div className={className}>
      {/* --- Móvil y tablet: acordeón ------------------------------------ */}
      <Acordeon
        className="lg:hidden"
        abiertosInicial={[activo.id]}
        items={items.map((item) => ({
          id: item.id,
          titulo: item.numero ? `${item.numero} · ${item.titulo}` : item.titulo,
          contenido: item.contenido,
        }))}
      />

      {/* --- Escritorio: lista + panel ----------------------------------- */}
      <div className="hidden gap-8 lg:grid lg:grid-cols-[minmax(0,20rem)_1fr]">
        <div
          role="tablist"
          aria-label={etiqueta}
          aria-orientation="vertical"
          onKeyDown={alTeclear}
          className="flex flex-col gap-2"
        >
          {items.map((item) => {
            const seleccionado = item.id === activo.id;
            return (
              <button
                key={item.id}
                id={`${base}-tab-${item.id}`}
                role="tab"
                type="button"
                aria-selected={seleccionado}
                aria-controls={`${base}-panel`}
                tabIndex={seleccionado ? 0 : -1}
                onClick={() => setActivoId(item.id)}
                className={cn(
                  "relative min-h-[44px] overflow-hidden rounded-lg border-2 p-4 text-left transition-colors",
                  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo",
                  seleccionado
                    ? "border-azul-profundo bg-azul-profundo text-blanco"
                    : "border-gris-borde bg-blanco hover:border-azul-medio",
                )}
              >
                <span className="flex items-baseline gap-3">
                  {item.numero && (
                    <span
                      className={cn(
                        "font-display text-2xl leading-none",
                        seleccionado ? "text-rojo" : "text-texto-sec",
                      )}
                    >
                      {item.numero}
                    </span>
                  )}
                  <span className="font-semibold">{item.titulo}</span>
                </span>
                {item.resumen && (
                  <span className={cn("mt-1 block text-sm", seleccionado ? "text-blanco/70" : "text-texto-sec")}>
                    {item.resumen}
                  </span>
                )}
                {seleccionado && (
                  <IndicadorActivo
                    id={`${base}-indicador`}
                    className="inset-y-0 left-0 right-auto bottom-auto h-full w-[3px]"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`${base}-panel`}
          aria-labelledby={`${base}-tab-${activo.id}`}
          tabIndex={0}
          className="focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
        >
          <motion.div
            key={activo.id}
            initial={reducido ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-lg border border-gris-borde bg-blanco p-6"
          >
            {activo.contenido}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
