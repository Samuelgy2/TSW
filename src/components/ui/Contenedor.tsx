import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ContenedorProps = {
  children: ReactNode;
  className?: string;
  /** Etiqueta HTML. `div` por defecto; `nav`, `article`... según semántica. */
  como?: ElementType;
  /** Ancho máximo. `lectura` acorta la línea para texto corrido. */
  ancho?: "sitio" | "lectura";
};

/**
 * Caja de contenido con los márgenes laterales del sitio. Server Component.
 *
 * La clase `.contenedor` vive en globals.css porque también la usan el header
 * y el footer; aquí solo se envuelve con tipos y el ancho de lectura.
 */
export function Contenedor({ children, className, como: Etiqueta = "div", ancho = "sitio" }: ContenedorProps) {
  return (
    <Etiqueta className={cn("contenedor", ancho === "lectura" && "max-w-3xl", className)}>
      {children}
    </Etiqueta>
  );
}
