"use client";

import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type VarianteBoton = "primario" | "secundario" | "fantasma";
export type TamanoBoton = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold " +
  // Área táctil mínima de 44 px y foco visible: requisitos, no adornos.
  "min-h-[44px] transition-[background-color,color,border-color,transform] duration-150 " +
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo " +
  "disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]";

const VARIANTES: Record<VarianteBoton, string> = {
  // Acento rojo: el único que lo usa de fondo. Blanco sobre #D7263D da 4.9:1.
  primario: "bg-rojo text-blanco hover:bg-rojo-oscuro",
  secundario:
    "bg-transparent text-azul-profundo border-2 border-azul-profundo hover:bg-azul-profundo hover:text-blanco",
  fantasma: "bg-transparent text-azul-profundo hover:bg-gris-frio",
};

const TAMANOS: Record<TamanoBoton, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-3 text-base",
  lg: "px-7 py-4 text-lg",
};

type PropsComunes = {
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  /** Ocupa todo el ancho disponible. Útil en móvil. */
  completo?: boolean;
  children: ReactNode;
  className?: string;
};

type PropsBoton = PropsComunes &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
  };

type PropsEnlace = PropsComunes & {
  /** Si hay href, se renderiza un enlace de verdad, no un div con onClick. */
  href: string;
  /** Abre en pestaña nueva con el rel correcto. */
  externo?: boolean;
};

export type BotonProps = PropsBoton | PropsEnlace;

function clases({ variante = "primario", tamano = "md", completo, className }: PropsComunes & { variante?: VarianteBoton; tamano?: TamanoBoton }) {
  return cn(BASE, VARIANTES[variante], TAMANOS[tamano], completo && "w-full", className);
}

export const Boton = forwardRef<HTMLButtonElement, BotonProps>(function Boton(props, ref) {
  if ("href" in props && props.href !== undefined) {
    const { href, externo, variante, tamano, completo, className, children } = props;
    const externas = externo ? { target: "_blank", rel: "noreferrer noopener" } : {};
    return (
      <Link href={href} className={clases({ variante, tamano, completo, className, children })} {...externas}>
        {children}
      </Link>
    );
  }

  const { variante, tamano, completo, className, children, type = "button", ...resto } = props;
  return (
    <button ref={ref} type={type} className={clases({ variante, tamano, completo, className, children })} {...resto}>
      {children}
    </button>
  );
});
