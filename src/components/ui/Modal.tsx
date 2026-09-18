"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { AnimatePresence, motion, useMovimientoReducido } from "@/lib/animaciones";
import { cn } from "@/lib/utils";

export type ModalProps = {
  abierto: boolean;
  alCerrar: () => void;
  titulo: string;
  children: ReactNode;
  /** Pie con los botones de acción. */
  pie?: ReactNode;
  className?: string;
};

const SELECTOR_FOCALIZABLES =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo modal accesible: rol `dialog`, foco atrapado, Escape cierra, el fondo
 * no hace scroll y al cerrarse el foco vuelve a donde estaba.
 */
export function Modal({ abierto, alCerrar, titulo, children, pie, className }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  const focoPrevio = useRef<HTMLElement | null>(null);
  const reducido = useMovimientoReducido();

  const alTeclear = useCallback(
    (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        alCerrar();
        return;
      }
      if (evento.key !== "Tab" || !panel.current) return;

      // Trampa de foco: el tabulador circula dentro del diálogo.
      const focalizables = panel.current.querySelectorAll<HTMLElement>(SELECTOR_FOCALIZABLES);
      if (focalizables.length === 0) return;

      const primero = focalizables[0] as HTMLElement;
      const ultimo = focalizables[focalizables.length - 1] as HTMLElement;

      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    },
    [alCerrar],
  );

  useEffect(() => {
    if (!abierto) return;

    focoPrevio.current = document.activeElement as HTMLElement | null;
    const desbordeOriginal = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", alTeclear);

    // El foco entra al diálogo en cuanto se abre.
    const primero = panel.current?.querySelector<HTMLElement>(SELECTOR_FOCALIZABLES);
    (primero ?? panel.current)?.focus();

    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = desbordeOriginal;
      focoPrevio.current?.focus();
    };
  }, [abierto, alTeclear]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {abierto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-azul-profundo/70"
            onClick={alCerrar}
            aria-hidden="true"
            initial={reducido ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducido ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={titulo}
            tabIndex={-1}
            className={cn(
              "relative z-10 flex max-h-[90vh] w-full flex-col rounded-t-lg bg-blanco",
              "sm:max-w-lg sm:rounded-lg",
              className,
            )}
            initial={reducido ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducido ? undefined : { opacity: 0, y: 24 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gris-borde p-5">
              <h2 className="text-xl">{titulo}</h2>
              <button
                type="button"
                onClick={alCerrar}
                className="min-h-[44px] min-w-[44px] rounded-md px-2 text-2xl leading-none text-texto-sec hover:bg-gris-frio focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
              >
                <span aria-hidden="true">×</span>
                <span className="sr-only">Cerrar</span>
              </button>
            </div>

            <div className="overflow-y-auto p-5">{children}</div>

            {pie && <div className="border-t border-gris-borde p-5">{pie}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
