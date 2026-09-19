"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";

import { IndicadorActivo } from "@/lib/animaciones";
import { cn } from "@/lib/utils";

export type OpcionTab = {
  valor: string;
  etiqueta: string;
};

export type TabsProps = {
  opciones: OpcionTab[];
  valor: string;
  alCambiar: (valor: string) => void;
  /** Nombre del grupo, para lectores de pantalla. */
  etiqueta: string;
  children?: ReactNode;
  className?: string;
};

/**
 * Pestañas con patrón ARIA completo: `tablist`, foco itinerante y navegación
 * con flechas, Inicio y Fin. La barra roja viaja entre pestañas con `layoutId`.
 *
 * La lista no envuelve: en móvil se desplaza en horizontal con scroll nativo
 * y la pestaña activa se trae a la vista sola. Así cinco niveles a 360px no
 * se apilan en tres filas.
 */
export function Tabs({ opciones, valor, alCambiar, etiqueta, children, className }: TabsProps) {
  const base = useId();
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    contenedor.current
      ?.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [valor]);

  function alTeclear(evento: KeyboardEvent<HTMLDivElement>) {
    const indice = opciones.findIndex((o) => o.valor === valor);
    if (indice === -1) return;

    let siguiente = indice;
    if (evento.key === "ArrowRight") siguiente = (indice + 1) % opciones.length;
    else if (evento.key === "ArrowLeft") siguiente = (indice - 1 + opciones.length) % opciones.length;
    else if (evento.key === "Home") siguiente = 0;
    else if (evento.key === "End") siguiente = opciones.length - 1;
    else return;

    evento.preventDefault();
    const destino = opciones[siguiente];
    if (!destino) return;
    alCambiar(destino.valor);
    contenedor.current
      ?.querySelector<HTMLButtonElement>(`#${CSS.escape(`${base}-${destino.valor}`)}`)
      ?.focus();
  }

  return (
    <div className={className}>
      <div
        ref={contenedor}
        role="tablist"
        aria-label={etiqueta}
        onKeyDown={alTeclear}
        className="flex gap-1 overflow-x-auto border-b border-gris-borde [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {opciones.map((opcion) => {
          const activa = opcion.valor === valor;
          return (
            <button
              key={opcion.valor}
              id={`${base}-${opcion.valor}`}
              role="tab"
              type="button"
              aria-selected={activa}
              aria-controls={`${base}-${opcion.valor}-panel`}
              tabIndex={activa ? 0 : -1}
              onClick={() => alCambiar(opcion.valor)}
              className={cn(
                "relative min-h-[44px] shrink-0 whitespace-nowrap px-4 py-2 text-base font-semibold transition-colors",
                "focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-rojo",
                activa ? "text-rojo" : "text-texto-sec hover:text-azul-profundo",
              )}
            >
              {opcion.etiqueta}
              {activa && <IndicadorActivo id={`${base}-indicador`} />}
            </button>
          );
        })}
      </div>

      {children && (
        <div
          role="tabpanel"
          id={`${base}-${valor}-panel`}
          aria-labelledby={`${base}-${valor}`}
          tabIndex={0}
          className="pt-6 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
        >
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Variante en píldoras para filtros de catálogo. Mismo indicador deslizante,
 * pero con `role="group"` y botones de alternancia: aquí no hay paneles.
 */
export function Filtros({
  opciones,
  valor,
  alCambiar,
  etiqueta,
  className,
}: Omit<TabsProps, "children">) {
  const base = useId();

  return (
    <div role="group" aria-label={etiqueta} className={cn("flex flex-wrap gap-2", className)}>
      {opciones.map((opcion) => {
        const activo = opcion.valor === valor;
        return (
          <button
            key={opcion.valor}
            type="button"
            aria-pressed={activo}
            onClick={() => alCambiar(opcion.valor)}
            className={cn(
              "relative min-h-[44px] overflow-hidden rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors",
              "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo",
              activo
                ? "border-rojo text-rojo"
                : "border-gris-borde text-texto-sec hover:border-azul-medio hover:text-azul-profundo",
            )}
          >
            {opcion.etiqueta}
            {activo && <IndicadorActivo id={`${base}-indicador`} />}
          </button>
        );
      })}
    </div>
  );
}
