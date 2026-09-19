import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Contenedor } from "./Contenedor";

export type TonoSeccion = "blanco" | "claro" | "oscuro" | "acento";

const TONOS: Record<TonoSeccion, string> = {
  blanco: "bg-blanco text-azul-profundo",
  claro: "bg-gris-frio text-azul-profundo",
  oscuro: "bg-azul-profundo text-blanco",
  // Rojo como fondo solo en franjas cortas de cierre, nunca en secciones largas.
  acento: "bg-rojo text-blanco",
};

export type SeccionProps = {
  children: ReactNode;
  tono?: TonoSeccion;
  /** Id del encabezado que da nombre a la sección (aria-labelledby). */
  tituloId?: string;
  id?: string;
  className?: string;
  /** Espaciado vertical. `compacto` para franjas y avisos. */
  espaciado?: "normal" | "compacto";
};

/**
 * Franja de página a todo el ancho con su contenedor dentro. Server Component.
 *
 * Es `<section>` con `aria-labelledby` cuando hay título: así el lector de
 * pantalla la anuncia por nombre. Sin título, es un `<div>` sin rol.
 */
export function Seccion({
  children,
  tono = "blanco",
  tituloId,
  id,
  className,
  espaciado = "normal",
}: SeccionProps) {
  const Etiqueta = tituloId ? "section" : "div";
  return (
    <Etiqueta
      id={id}
      aria-labelledby={tituloId}
      className={cn(
        TONOS[tono],
        espaciado === "normal" ? "py-12 sm:py-16 lg:py-20" : "py-6 sm:py-8",
        className,
      )}
    >
      <Contenedor>{children}</Contenedor>
    </Etiqueta>
  );
}

/** Encabezado de sección: título y bajada opcional. */
export function SeccionTitulo({
  id,
  children,
  bajada,
  className,
}: {
  id: string;
  children: ReactNode;
  bajada?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <h2 id={id} className="text-3xl sm:text-4xl">
        {children}
      </h2>
      {bajada && <p className="mt-2 text-lg opacity-85">{bajada}</p>}
    </div>
  );
}
