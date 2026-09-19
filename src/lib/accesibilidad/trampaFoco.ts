"use client";

import { useEffect, type RefObject } from "react";

const SELECTOR_FOCALIZABLES =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Mantiene el foco dentro de un contenedor mientras esté activo: el tabulador
 * circula entre el primer y el último elemento focalizable, el foco entra al
 * abrir y vuelve a donde estaba al cerrar. Lo usan el modal y el menú móvil.
 *
 * Escape no se maneja aquí: cada componente decide qué hacer al cerrar.
 */
export function useTrampaFoco(contenedor: RefObject<HTMLElement | null>, activo: boolean) {
  useEffect(() => {
    if (!activo) return;
    const nodo = contenedor.current;
    if (!nodo) return;

    const focoPrevio = document.activeElement as HTMLElement | null;

    function focalizables() {
      return Array.from(nodo!.querySelectorAll<HTMLElement>(SELECTOR_FOCALIZABLES));
    }

    function alTeclear(evento: KeyboardEvent) {
      if (evento.key !== "Tab") return;
      const lista = focalizables();
      if (lista.length === 0) {
        evento.preventDefault();
        return;
      }
      const primero = lista[0] as HTMLElement;
      const ultimo = lista[lista.length - 1] as HTMLElement;
      const dentro = nodo!.contains(document.activeElement);

      if (evento.shiftKey && (document.activeElement === primero || !dentro)) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && (document.activeElement === ultimo || !dentro)) {
        evento.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener("keydown", alTeclear);
    // El foco entra al abrir. Si no hay nada focalizable, al propio contenedor.
    (focalizables()[0] ?? nodo).focus();

    return () => {
      document.removeEventListener("keydown", alTeclear);
      focoPrevio?.focus();
    };
  }, [contenedor, activo]);
}
