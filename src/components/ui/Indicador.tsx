import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type IndicadorProps = {
  etiqueta: string;
  /** Número ya formateado, o null cuando el dato no existe todavía. */
  valor: number | string | null;
  /** Línea de contexto: "este mes", "esperando pago". */
  detalle?: ReactNode;
  /** Enlace a la sección que explica la cifra. */
  href?: string;
  className?: string;
};

/**
 * Cifra clave del panel. Con `valor` en null muestra "—" y el detalle explica
 * por qué: no se inventa un cero para que la cuadrícula quede bonita.
 */
export function Indicador({ etiqueta, valor, detalle, href, className }: IndicadorProps) {
  const contenido = (
    <>
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-texto-sec">{etiqueta}</p>
      <p className="mt-2 font-display text-4xl leading-none text-azul-profundo sm:text-5xl">
        {valor === null ? <span aria-label="Sin dato">—</span> : valor}
      </p>
      {detalle && <p className="mt-2 text-sm text-texto-sec">{detalle}</p>}
    </>
  );

  const base = "block rounded-lg border border-gris-borde bg-blanco p-5";

  if (href) {
    return (
      <a
        href={href}
        className={cn(
          base,
          "transition-colors hover:border-azul-medio focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo",
          className,
        )}
      >
        {contenido}
      </a>
    );
  }

  return <div className={cn(base, className)}>{contenido}</div>;
}
