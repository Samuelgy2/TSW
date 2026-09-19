"use client";

import { useId, useState, type ReactNode } from "react";

import { AnimatePresence, motion, useMovimientoReducido } from "@/lib/animaciones";
import { cn } from "@/lib/utils";

export type ItemAcordeon = {
  id: string;
  titulo: string;
  contenido: ReactNode;
};

export type AcordeonProps = {
  items: ItemAcordeon[];
  /** Un solo panel abierto a la vez. Es el comportamiento por defecto. */
  exclusivo?: boolean;
  /** Ids abiertos al montar. */
  abiertosInicial?: string[];
  className?: string;
};

/**
 * Acordeón con `<button>` real, `aria-expanded` y `aria-controls`. El panel se
 * desmonta al cerrarse, así que su contenido no queda accesible por teclado
 * mientras está oculto.
 */
export function Acordeon({ items, exclusivo = true, abiertosInicial = [], className }: AcordeonProps) {
  const [abiertos, setAbiertos] = useState<string[]>(abiertosInicial);
  const base = useId();
  const reducido = useMovimientoReducido();

  function alternar(id: string) {
    setAbiertos((previos) => {
      const yaAbierto = previos.includes(id);
      if (exclusivo) return yaAbierto ? [] : [id];
      return yaAbierto ? previos.filter((p) => p !== id) : [...previos, id];
    });
  }

  return (
    <div className={cn("divide-y divide-gris-borde border-y border-gris-borde", className)}>
      {items.map((item) => {
        const abierto = abiertos.includes(item.id);
        const idBoton = `${base}-${item.id}-boton`;
        const idPanel = `${base}-${item.id}-panel`;

        return (
          <div key={item.id}>
            <h3>
              <button
                type="button"
                id={idBoton}
                aria-expanded={abierto}
                aria-controls={idPanel}
                onClick={() => alternar(item.id)}
                className="flex min-h-[44px] w-full items-center justify-between gap-4 py-4 text-left text-base font-semibold text-azul-profundo transition-colors hover:text-rojo focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
              >
                <span>{item.titulo}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "shrink-0 text-2xl leading-none text-rojo transition-transform duration-200",
                    abierto && "rotate-45",
                  )}
                >
                  +
                </span>
              </button>
            </h3>

            <AnimatePresence initial={false}>
              {abierto && (
                <motion.div
                  id={idPanel}
                  role="region"
                  aria-labelledby={idBoton}
                  initial={reducido ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reducido ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="pb-5 text-texto-sec">{item.contenido}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
