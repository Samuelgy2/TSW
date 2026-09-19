import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type PaginaPanelProps = {
  titulo: string;
  descripcion?: ReactNode;
  /** Botón de acción principal de la sección: "Nuevo producto", "Publicar versión". */
  accion?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Encabezado y cuerpo de una sección del panel. Server Component. El `h1`
 * de cada página del panel vive aquí; la acción principal queda a la derecha
 * en escritorio y debajo del título en móvil.
 */
export function PaginaPanel({ titulo, descripcion, accion, children, className }: PaginaPanelProps) {
  return (
    <div className={cn("px-4 py-6 sm:px-6 lg:px-8 lg:py-8", className)}>
      <header className="flex flex-col gap-4 border-b border-gris-borde pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl">{titulo}</h1>
          {descripcion && <p className="mt-1 text-texto-sec">{descripcion}</p>}
        </div>
        {accion && <div className="flex shrink-0 flex-col gap-2 sm:flex-row">{accion}</div>}
      </header>
      <div className="pt-6">{children}</div>
    </div>
  );
}
