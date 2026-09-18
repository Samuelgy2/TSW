import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Base = {
  children: ReactNode;
  className?: string;
  /** Superficie oscura, para secciones sobre azul profundo. */
  oscura?: boolean;
};

/**
 * Tarjeta base. La micro-interacción de hover es una transición CSS, no
 * JavaScript: el bloque de prefers-reduced-motion de globals.css la desactiva
 * sola y el componente puede seguir siendo Server Component.
 */
export function Card({ children, className, oscura = false }: Base) {
  return (
    <div
      className={cn(
        "rounded-lg border",
        oscura ? "border-blanco/15 bg-azul-medio text-blanco" : "border-gris-borde bg-blanco",
        className,
      )}
    >
      {children}
    </div>
  );
}

export type CardEnlaceProps = Base & {
  href: string;
  /** Texto accesible cuando el contenido visible no basta. */
  etiquetaAccesible?: string;
};

/**
 * Tarjeta que enlaza. Es un `<a>` de verdad: se abre en pestaña nueva con el
 * clic central, se copia el enlace y el teclado la alcanza. Nada de onClick
 * sobre un div.
 */
export function CardEnlace({
  children,
  className,
  href,
  oscura = false,
  etiquetaAccesible,
}: CardEnlaceProps) {
  return (
    <Link
      href={href}
      aria-label={etiquetaAccesible}
      className={cn(
        "group block rounded-lg border transition-transform duration-200",
        "hover:scale-[1.02] hover:shadow-lg",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo",
        oscura ? "border-blanco/15 bg-azul-medio text-blanco" : "border-gris-borde bg-blanco",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function CardCuerpo({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

export function CardTitulo({
  children,
  className,
  nivel = 3,
}: {
  children: ReactNode;
  className?: string;
  nivel?: 2 | 3 | 4;
}) {
  const Etiqueta = `h${nivel}` as const;
  return <Etiqueta className={cn("text-lg leading-tight", className)}>{children}</Etiqueta>;
}
