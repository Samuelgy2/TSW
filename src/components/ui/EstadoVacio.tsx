import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type EstadoVacioProps = {
  titulo: string;
  texto?: ReactNode;
  /** Botón o enlace para salir del vacío: "Ir a la tienda", "Ver niveles". */
  accion?: ReactNode;
  /** Sobre fondo oscuro. */
  oscuro?: boolean;
  className?: string;
};

/**
 * Sección sin datos. Dice qué falta y, si se puede, a dónde ir. Se usa en
 * toda vista que consulte y no reciba filas: el sitio saldrá a producción
 * con tablas vacías y no puede verse roto.
 */
export function EstadoVacio({ titulo, texto, accion, oscuro = false, className }: EstadoVacioProps) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-lg border-2 border-dashed px-6 py-10 text-center",
        oscuro ? "border-blanco/25 text-blanco" : "border-gris-borde bg-blanco text-azul-profundo",
        className,
      )}
    >
      <p className="text-xl font-display uppercase">{titulo}</p>
      {texto && <p className={cn("mx-auto mt-2 max-w-md", oscuro ? "text-blanco/80" : "text-texto-sec")}>{texto}</p>}
      {accion && <div className="mt-6 flex justify-center">{accion}</div>}
    </div>
  );
}
