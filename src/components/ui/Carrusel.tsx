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
  /**
   * Se llama cada vez que cambia la diapositiva activa (por scroll, flecha,
   * indicador o avance automático). Existe para el modo "hero de fondo"
   * (HeroPortal): un texto fuera de este componente necesita saber cuál
   * imagen está activa para hacerle un fundido sincronizado.
   */
  alCambiarIndice?: (indice: number) => void;
  /**
   * Detiene el avance automático desde fuera. HeroPortal lo usa cuando el foco
   * está en el texto/CTA del hero: si el slide rotara ahí, el botón enfocado
   * se desmontaría bajo el teclado (WCAG 2.2.2 / 3.2.1).
   */
  pausado?: boolean;
  /**
   * Modo "historias": clic/toque en la mitad izquierda de la pista retrocede y
   * en la derecha avanza. Las flechas siguen en el DOM como botones reales
   * (Tab, lector de pantalla, ← →) pero invisibles hasta recibir foco. El
   * deslizamiento táctil sigue siendo el scroll nativo de la pista.
   */
  zonasToque?: boolean;
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
 *   ratón encima, con el foco de teclado dentro, con la pestaña oculta y con
 *   `prefers-reduced-motion`. Cualquier navegación manual (flechas, puntos,
 *   teclas, deslizamiento) reinicia la cuenta.
 * - La pista es `aria-live="polite"` solo cuando no rota sola.
 */
export function Carrusel({
  diapositivas,
  etiqueta,
  intervaloMs = 6000,
  className,
  claseDiapositiva,
  sobreOscuro = true,
  alCambiarIndice,
  pausado = false,
  zonasToque = false,
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
  /** Sube con cada gesto manual: reinicia el temporizador del avance automático. */
  const [gestos, setGestos] = useState(0);

  const activoPorUsuario = preferencia === "auto" ? !reducido : preferencia === "reproducir";
  const rotando =
    intervaloMs > 0 &&
    total > 1 &&
    activoPorUsuario &&
    !cursorDentro &&
    !focoDentro &&
    !pausado &&
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

  /** Navegación del usuario: mueve y reinicia la cuenta, para no saltar justo tras el clic. */
  const irManual = useCallback(
    (destino: number) => {
      setGestos((n) => n + 1);
      ir(destino);
    },
    [ir],
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
  }, [rotando, indice, gestos, intervaloMs, ir]);

  useEffect(() => {
    alCambiarIndice?.(indice);
  }, [indice, alCambiarIndice]);

  function alTeclear(evento: KeyboardEvent<HTMLElement>) {
    if (evento.key === "ArrowRight") {
      evento.preventDefault();
      irManual(indice + 1);
    } else if (evento.key === "ArrowLeft") {
      evento.preventDefault();
      irManual(indice - 1);
    }
  }

  const colorControl = sobreOscuro
    ? "text-blanco border-blanco/40 hover:bg-blanco/15"
    : "text-azul-profundo border-azul-profundo/40 hover:bg-azul-profundo/10";

  const BOTON_CONTROL =
    "flex h-11 w-11 items-center justify-center rounded-full border-2 transition-colors " +
    "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco";

  // Invisibles y sin capturar puntero (el clic lo resuelve la pista), pero
  // focuseables y anunciados; al enfocarse aparecen con su anillo de foco.
  const ZONAS_FLECHA = "flex pointer-events-none opacity-0 focus-visible:opacity-100";

  return (
    <section
      aria-roledescription="carrusel"
      aria-label={etiqueta}
      className={cn("relative isolate", className)}
      // Solo el ratón pausa por "encima": un toque deja un mouseenter emulado
      // que nunca se va y dejaría el carrusel pausado para siempre en móvil.
      onPointerEnter={(evento) => evento.pointerType === "mouse" && setCursorDentro(true)}
      onPointerLeave={(evento) => evento.pointerType === "mouse" && setCursorDentro(false)}
      // Foco de teclado, no de clic: tras pulsar un punto con el ratón el botón
      // conserva el foco, y eso no debe congelar la rotación.
      onFocusCapture={(evento) => setFocoDentro((evento.target as HTMLElement).matches(":focus-visible"))}
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
        // h-full: sin efecto en el modo "tarjetas" (el alto lo da claseDiapositiva
        // en unidades fijas, y con un ancestro de alto indefinido un alto en
        // porcentaje se computa como auto — CSS 2.1 §10.5). Con efecto real en
        // el modo "hero de fondo" (HeroPortal): ahí el contenedor SÍ tiene un
        // alto definido —absolute inset-0 dentro de una sección con contenido—
        // y esta clase es lo que permite que claseDiapositiva="h-full" llegue
        // a las diapositivas.
        // Un clic (no un arrastre: ese no dispara click) se resuelve por mitades.
        // Sin rol ni tabIndex a propósito: el equivalente accesible son los
        // botones de flecha y las teclas ← →; esto es solo un atajo de puntero.
        onClick={
          zonasToque
            ? (evento) => {
                const caja = evento.currentTarget.getBoundingClientRect();
                irManual(evento.clientX < caja.left + caja.width / 2 ? indice - 1 : indice + 1);
              }
            : undefined
        }
        // Un deslizamiento también es navegación manual: reinicia la cuenta.
        onPointerDown={() => setGestos((n) => n + 1)}
        className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
            onClick={() => irManual(indice - 1)}
            aria-label="Diapositiva anterior"
            aria-controls={`${base}-pista`}
            className={cn(
              BOTON_CONTROL,
              colorControl,
              "absolute left-4 top-1/2 -translate-y-1/2 lg:left-6",
              zonasToque ? ZONAS_FLECHA : "hidden sm:flex",
            )}
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              ‹
            </span>
          </button>
          <button
            type="button"
            onClick={() => irManual(indice + 1)}
            aria-label="Diapositiva siguiente"
            aria-controls={`${base}-pista`}
            className={cn(
              BOTON_CONTROL,
              colorControl,
              "absolute right-4 top-1/2 -translate-y-1/2 lg:right-6",
              zonasToque ? ZONAS_FLECHA : "hidden sm:flex",
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
                  onClick={() => irManual(i)}
                  aria-label={`Ir a la diapositiva ${i + 1}: ${diapositiva.nombre}`}
                  aria-current={activa ? "true" : undefined}
                  aria-controls={`${base}-${diapositiva.id}`}
                  className="group flex h-11 w-11 items-center justify-center focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "block h-1.5 rounded-full transition-[width,background-color] duration-300",
                      activa
                        ? "w-8 bg-acento"
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
