"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { useMovimientoReducido } from "@/lib/animaciones";
import { cn } from "@/lib/utils";

export type DiapositivaCarrusel = {
  id: string;
  /** Nombre corto para el indicador: "Ir a la diapositiva 2: Semilleros". */
  nombre: string;
  contenido: ReactNode;
};

export type CarruselProps = {
  diapositivas: DiapositivaCarrusel[];
  /** Nombre del carrusel para lectores de pantalla. */
  etiqueta: string;
  /** Milisegundos entre avances automáticos. 0 desactiva el avance. */
  intervaloMs?: number;
  className?: string;
  /** Clases de cada diapositiva (alto, fondo). */
  claseDiapositiva?: string;
  /** Controles sobre fondo oscuro (blanco) o claro (azul profundo). */
  sobreOscuro?: boolean;
};

/**
 * Carrusel con desplazamiento nativo: la pista es un contenedor con
 * `scroll-snap`, así que en táctil se desliza con el dedo y en escritorio
 * responde a flechas, indicadores y rueda horizontal sin librería de gestos.
 *
 * Accesibilidad (patrón WAI-ARIA de carrusel):
 * - `aria-roledescription` en contenedor y diapositivas, cada una "N de M".
 * - Las diapositivas no visibles llevan `inert`: el teclado y el lector de
 *   pantalla no llegan a sus botones.
 * - Botón visible de pausa. El avance automático se detiene además con el
 *   cursor encima, con el foco dentro, con la pestaña oculta y con
 *   `prefers-reduced-motion`.
 * - La pista es `aria-live="polite"` solo cuando no rota sola.
 */
export function Carrusel({
  diapositivas,
  etiqueta,
  intervaloMs = 6000,
  className,
  claseDiapositiva,
  sobreOscuro = true,
}: CarruselProps) {
  const base = useId();
  const pista = useRef<HTMLDivElement>(null);
  const reducido = useMovimientoReducido();
  const total = diapositivas.length;

  const [indice, setIndice] = useState(0);
  /**
   * Preferencia explícita del botón de pausa. En `auto` manda el sistema:
   * rota salvo con movimiento reducido. Quien tenga movimiento reducido puede
   * aun así activar la rotación a mano con `reproducir`.
   */
  const [preferencia, setPreferencia] = useState<"auto" | "pausa" | "reproducir">("auto");
  const [cursorDentro, setCursorDentro] = useState(false);
  const [focoDentro, setFocoDentro] = useState(false);
  const [pestanaVisible, setPestanaVisible] = useState(true);

  const activoPorUsuario = preferencia === "auto" ? !reducido : preferencia === "reproducir";
  const rotando =
    intervaloMs > 0 &&
    total > 1 &&
    activoPorUsuario &&
    !cursorDentro &&
    !focoDentro &&
    pestanaVisible;

  /** Desplaza la pista hasta la diapositiva pedida, con ciclo en los extremos. */
  const ir = useCallback(
    (destino: number) => {
      const nodo = pista.current;
      if (!nodo || total === 0) return;
      const objetivo = ((destino % total) + total) % total;
      nodo.scrollTo({
        left: objetivo * nodo.clientWidth,
        // Con movimiento reducido el salto es inmediato; el `scroll-behavior:
        // auto !important` de globals.css lo garantiza aunque aquí diga smooth.
        behavior: reducido ? "auto" : "smooth",
      });
    },
    [total, reducido],
  );

  // El índice real sale de la posición de la pista: así el deslizamiento
  // táctil y el scroll programático llegan al mismo estado.
  useEffect(() => {
    const nodo = pista.current;
    if (!nodo) return;
    let marco = 0;
    function alDesplazar() {
      cancelAnimationFrame(marco);
      marco = requestAnimationFrame(() => {
        if (!nodo || nodo.clientWidth === 0) return;
        const nuevo = Math.round(nodo.scrollLeft / nodo.clientWidth);
        setIndice((actual) => (actual === nuevo ? actual : nuevo));
      });
    }
    nodo.addEventListener("scroll", alDesplazar, { passive: true });
    return () => {
      nodo.removeEventListener("scroll", alDesplazar);
      cancelAnimationFrame(marco);
    };
  }, []);

  // Pestaña en segundo plano: no tiene sentido rotar lo que nadie ve.
  useEffect(() => {
    function alCambiarVisibilidad() {
      setPestanaVisible(document.visibilityState === "visible");
    }
    alCambiarVisibilidad();
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () => document.removeEventListener("visibilitychange", alCambiarVisibilidad);
  }, []);

  useEffect(() => {
    if (!rotando) return;
    const temporizador = window.setInterval(() => ir(indice + 1), intervaloMs);
    return () => window.clearInterval(temporizador);
  }, [rotando, indice, intervaloMs, ir]);

  function alTeclear(evento: KeyboardEvent<HTMLElement>) {
    if (evento.key === "ArrowRight") {
      evento.preventDefault();
      ir(indice + 1);
    } else if (evento.key === "ArrowLeft") {
      evento.preventDefault();
      ir(indice - 1);
    }
  }

  const colorControl = sobreOscuro
    ? "text-blanco border-blanco/40 hover:bg-blanco/15"
    : "text-azul-profundo border-azul-profundo/40 hover:bg-azul-profundo/10";

  const BOTON_CONTROL =
    "flex h-11 w-11 items-center justify-center rounded-full border-2 transition-colors " +
    "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo";

  return (
    <section
      aria-roledescription="carrusel"
      aria-label={etiqueta}
      className={cn("relative isolate", className)}
      onMouseEnter={() => setCursorDentro(true)}
      onMouseLeave={() => setCursorDentro(false)}
      onFocusCapture={() => setFocoDentro(true)}
      onBlurCapture={(evento) => {
        // Solo cuenta como salida si el nuevo foco queda fuera del carrusel.
        if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) setFocoDentro(false);
      }}
      onKeyDown={alTeclear}
    >
      <div
        ref={pista}
        id={`${base}-pista`}
        aria-live={rotando ? "off" : "polite"}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {diapositivas.map((diapositiva, i) => (
          <div
            key={diapositiva.id}
            id={`${base}-${diapositiva.id}`}
            role="group"
            aria-roledescription="diapositiva"
            aria-label={`${i + 1} de ${total}`}
            inert={i !== indice}
            className={cn("relative w-full shrink-0 snap-start", claseDiapositiva)}
          >
            {diapositiva.contenido}
          </div>
        ))}
      </div>

      {/* Flechas: solo desde tablet. En móvil bastan el gesto y los indicadores. */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={() => ir(indice - 1)}
            aria-label="Diapositiva anterior"
            aria-controls={`${base}-pista`}
            className={cn(
              BOTON_CONTROL,
              colorControl,
              "absolute left-4 top-1/2 hidden -translate-y-1/2 sm:flex lg:left-6",
            )}
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              ‹
            </span>
          </button>
          <button
            type="button"
            onClick={() => ir(indice + 1)}
            aria-label="Diapositiva siguiente"
            aria-controls={`${base}-pista`}
            className={cn(
              BOTON_CONTROL,
              colorControl,
              "absolute right-4 top-1/2 hidden -translate-y-1/2 sm:flex lg:right-6",
            )}
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              ›
            </span>
          </button>
        </>
      )}

      {/* Indicadores y pausa. Cada control mide 44 px con 8 px entre ellos. */}
      {total > 1 && (
        <div className="contenedor absolute inset-x-0 bottom-3 flex items-center justify-between gap-4 sm:bottom-5">
          <div role="group" aria-label="Elegir diapositiva" className="flex items-center gap-2">
            {diapositivas.map((diapositiva, i) => {
              const activa = i === indice;
              return (
                <button
                  key={diapositiva.id}
                  type="button"
                  onClick={() => ir(i)}
                  aria-label={`Ir a la diapositiva ${i + 1}: ${diapositiva.nombre}`}
                  aria-current={activa ? "true" : undefined}
                  aria-controls={`${base}-${diapositiva.id}`}
                  className="group flex h-11 w-11 items-center justify-center focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "block h-1.5 rounded-full transition-[width,background-color] duration-300",
                      activa
                        ? "w-8 bg-rojo"
                        : sobreOscuro
                          ? "w-4 bg-blanco/50 group-hover:bg-blanco/80"
                          : "w-4 bg-azul-profundo/40 group-hover:bg-azul-profundo/70",
                    )}
                  />
                </button>
              );
            })}
          </div>

          {intervaloMs > 0 && (
            <button
              type="button"
              onClick={() => setPreferencia(activoPorUsuario ? "pausa" : "reproducir")}
              aria-pressed={!activoPorUsuario}
              aria-label={activoPorUsuario ? "Pausar el avance automático" : "Reanudar el avance automático"}
              className={cn(BOTON_CONTROL, colorControl)}
            >
              <span aria-hidden="true" className="text-base leading-none">
                {activoPorUsuario ? "❚❚" : "▶"}
              </span>
            </button>
          )}
        </div>
      )}
    </section>
  );
}
