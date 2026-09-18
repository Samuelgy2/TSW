"use client";

/**
 * Capa única de animación.
 *
 * Regla del proyecto: `prefers-reduced-motion` se respeta UNA vez, aquí. Ningún
 * componente vuelve a preguntar por él.
 *
 * Dos reglas más, que vienen de errores concretos:
 *
 * 1. NUNCA se cambia la estructura del árbol según el movimiento reducido. Esa
 *    preferencia solo se conoce en el navegador, así que decidir con ella qué
 *    etiquetas renderizar produce un árbol en el servidor y otro en el cliente
 *    —un fallo de hidratación—. Lo que varía son las props de animación, nunca
 *    los elementos.
 *
 * 2. El primer render, en servidor y en cliente, es siempre el estático: el
 *    contenido sale visible en el HTML. Nada nace con `opacity: 0` esperando a
 *    que cargue JavaScript, porque eso retrasaría la lectura.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";

/** Desplazamiento de entrada, en píxeles. Sutil a propósito. */
const DESPLAZAMIENTO = 20;
/** Escalonado entre hermanos. */
const PASO_ESCALONADO = 0.06;
/** Techo de duración. Nada en el sitio anima más lento que esto. */
export const DURACION_MAXIMA = 0.4;

export const SUAVIZADO = [0.22, 1, 0.36, 1] as const;

const variantesEntrada: Variants = {
  oculto: { opacity: 0, y: DESPLAZAMIENTO },
  visible: (indice: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      delay: indice * PASO_ESCALONADO,
      ease: SUAVIZADO,
    },
  }),
};

/** true una vez que el componente ya vive en el navegador. */
function useMontado(): boolean {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  return montado;
}

/**
 * ¿Hay que moverse poco? Único punto de consulta.
 *
 * Devuelve `true` hasta que el componente monta: así el primer render del
 * cliente es idéntico al del servidor y no hay desajuste de hidratación. Una
 * vez montado, pasa a reflejar la preferencia real del sistema.
 */
export function useMovimientoReducido(): boolean {
  const reducido = useReducedMotion();
  const montado = useMontado();
  return !montado || reducido === true;
}

type EtiquetaAnimable = "div" | "section" | "li" | "article" | "header";

type ApareceProps = {
  children: ReactNode;
  /** Posición entre hermanos: cada uno entra 60 ms después del anterior. */
  indice?: number;
  className?: string;
  como?: EtiquetaAnimable;
};

/**
 * Entrada por scroll, una sola vez.
 *
 * Solo anima lo que todavía no se ha leído: al montar mide su posición y, si ya
 * está en pantalla, se queda quieto. Así el contenido de la primera pantalla
 * nunca parpadea ni espera a una animación para ser legible.
 */
export function Aparece({ children, indice = 0, className, como = "div" }: ApareceProps) {
  const reducido = useMovimientoReducido();
  const [animar, setAnimar] = useState(false);
  const elemento = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (reducido || animar) return;
    const caja = elemento.current?.getBoundingClientRect();
    if (!caja) return;
    // Por debajo del 90% de la ventana: todavía hay que hacer scroll para
    // llegar, así que se puede animar sin que nadie vea el salto.
    if (caja.top > window.innerHeight * 0.9) setAnimar(true);
  }, [reducido, animar]);

  const Motion = motion[como];
  const guardarRef = (nodo: HTMLElement | null) => {
    elemento.current = nodo;
  };

  if (!animar) {
    return (
      <Motion ref={guardarRef} className={className}>
        {children}
      </Motion>
    );
  }

  return (
    <Motion
      ref={guardarRef}
      className={className}
      custom={indice}
      variants={variantesEntrada}
      initial="oculto"
      whileInView="visible"
      viewport={{ once: true, margin: "-64px" }}
    >
      {children}
    </Motion>
  );
}

/**
 * Micro-interacción de tarjeta: escala 1.02 al pasar el cursor.
 * Con movimiento reducido, un objeto vacío.
 */
export function usePropsTarjeta() {
  const reducido = useMovimientoReducido();
  if (reducido) return {};
  return {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.99 },
    transition: { duration: 0.18, ease: SUAVIZADO },
  } as const;
}

/**
 * Indicador deslizante de pestañas y filtros. El `layoutId` hace que la barra
 * roja viaje entre opciones. Siempre es un `motion.span`: lo que cambia es si
 * lleva `layoutId`, no la etiqueta que se pinta.
 */
export function IndicadorActivo({ id, className = "" }: { id: string; className?: string }) {
  const reducido = useMovimientoReducido();
  const clases = `absolute inset-x-0 bottom-0 h-[3px] bg-rojo ${className}`;

  return (
    <motion.span
      layoutId={reducido ? undefined : id}
      className={clases}
      aria-hidden="true"
      transition={{ duration: 0.25, ease: SUAVIZADO }}
    />
  );
}

export { AnimatePresence, motion };
