"use client";

import Link from "next/link";
import {
  cloneElement,
  forwardRef,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export type VarianteBoton = "primario" | "secundario" | "fantasma";
export type TamanoBoton = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold " +
  // Área táctil mínima de 44 px y foco visible: requisitos, no adornos.
  "min-h-[44px] transition-[background-color,color,border-color,transform] duration-150 " +
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo " +
  "disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]";

/**
 * Variantes sobre fondo claro. El primario es el único que usa el rojo como
 * fondo: blanco sobre #D7263D da 4.96:1.
 */
const VARIANTES: Record<VarianteBoton, string> = {
  primario: "bg-rojo text-blanco hover:bg-rojo-oscuro",
  secundario:
    "bg-transparent text-azul-profundo border-2 border-azul-profundo hover:bg-azul-profundo hover:text-blanco",
  fantasma: "bg-transparent text-azul-profundo hover:bg-gris-frio",
};

/**
 * Las mismas variantes sobre azul profundo o azul medio. El primario no cambia;
 * el secundario y el fantasma pasan a blanco para conservar el contraste.
 */
const VARIANTES_OSCURO: Record<VarianteBoton, string> = {
  primario: VARIANTES.primario,
  secundario:
    "bg-transparent text-blanco border-2 border-blanco hover:bg-blanco hover:text-azul-profundo",
  fantasma: "bg-transparent text-blanco hover:bg-blanco/10",
};

/**
 * Sobre la franja roja. Rojo sobre rojo no existe: el primario se invierte a
 * blanco con texto rojo (4.96:1) y los demás van en blanco.
 */
const VARIANTES_ACENTO: Record<VarianteBoton, string> = {
  primario: "bg-blanco text-rojo hover:bg-gris-frio",
  secundario: "bg-transparent text-blanco border-2 border-blanco hover:bg-blanco hover:text-rojo",
  fantasma: "bg-transparent text-blanco hover:bg-blanco/15",
};

/** Fondo sobre el que se apoya el botón. Cambia la paleta, no la forma. */
export type FondoBoton = "claro" | "oscuro" | "acento";

const PALETAS: Record<FondoBoton, Record<VarianteBoton, string>> = {
  claro: VARIANTES,
  oscuro: VARIANTES_OSCURO,
  acento: VARIANTES_ACENTO,
};

const TAMANOS: Record<TamanoBoton, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-3 text-base",
  lg: "px-7 py-4 text-lg",
};

type PropsComunes = {
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  /** Fondo sobre el que va: `claro` (por defecto), `oscuro` o `acento` (rojo). */
  fondo?: FondoBoton;
  /** Ocupa todo el ancho disponible. Útil en móvil. */
  completo?: boolean;
  className?: string;
};

type PropsBoton = PropsComunes &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    children: ReactNode;
    href?: undefined;
    /**
     * Envío en curso: deshabilita el botón, muestra un indicador y anuncia
     * `aria-busy`. Evita el doble clic que crea dos registros.
     */
    cargando?: boolean;
  };

type PropsEnlace = PropsComunes & {
  children: ReactNode;
  /** Si hay href, se renderiza un enlace de verdad, no un div con onClick. */
  href: string;
  /** Abre en pestaña nueva con el rel correcto. */
  externo?: boolean;
};

type PropsAsChild = PropsComunes & {
  /**
   * Presta las clases al único hijo en vez de envolverlo. Sirve para un `<a>`
   * plano (descarga de un PDF, enlace externo con atributos propios) o
   * cualquier elemento que ya sea interactivo por sí mismo.
   */
  asChild: true;
  children: ReactElement<{ className?: string }>;
  href?: undefined;
};

export type BotonProps = PropsBoton | PropsEnlace | PropsAsChild;

function clases({ variante = "primario", tamano = "md", fondo = "claro", completo, className }: PropsComunes) {
  return cn(BASE, PALETAS[fondo][variante], TAMANOS[tamano], completo && "w-full", className);
}

export const Boton = forwardRef<HTMLButtonElement, BotonProps>(function Boton(props, ref) {
  if ("asChild" in props) {
    const { children, variante, tamano, fondo, completo, className } = props;
    if (!isValidElement<{ className?: string }>(children)) return null;
    return cloneElement(children, {
      className: cn(clases({ variante, tamano, fondo, completo, className }), children.props.className),
    });
  }

  if ("href" in props && props.href !== undefined) {
    const { href, externo, children, variante, tamano, fondo, completo, className } = props;
    const estilo = { variante, tamano, fondo, completo, className };
    const externas = externo ? { target: "_blank", rel: "noreferrer noopener" } : {};
    return (
      <Link href={href} className={clases(estilo)} {...externas}>
        {children}
      </Link>
    );
  }

  const {
    variante,
    tamano,
    fondo,
    completo,
    className,
    children,
    cargando = false,
    disabled,
    type = "button",
    ...resto
  } = props;
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={clases({ variante, tamano, fondo, completo, className })}
      {...resto}
    >
      {cargando && (
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
});
