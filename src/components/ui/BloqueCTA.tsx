import type { ReactNode } from "react";

import { Seccion, type TonoSeccion } from "./Seccion";

export type BloqueCTAProps = {
  titulo: string;
  texto?: ReactNode;
  /** Uno o dos botones, ya con `fondo` acorde al tono. */
  acciones: ReactNode;
  tono?: Extract<TonoSeccion, "acento" | "oscuro">;
  tituloId: string;
};

/**
 * Franja de cierre con una llamada a la acción. Rojo por defecto: es el único
 * lugar donde el rojo hace de fondo, y por eso es corta y va al final.
 * Los botones dentro deben llevar `fondo="acento"` (o `"oscuro"`).
 */
export function BloqueCTA({ titulo, texto, acciones, tono = "acento", tituloId }: BloqueCTAProps) {
  return (
    <Seccion tono={tono} tituloId={tituloId}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <h2 id={tituloId} className="text-3xl sm:text-4xl">
            {titulo}
          </h2>
          {texto && <p className="mt-3 text-lg text-blanco/90">{texto}</p>}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">{acciones}</div>
      </div>
    </Seccion>
  );
}
