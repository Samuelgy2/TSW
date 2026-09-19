import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ColumnaTabla<T> = {
  clave: string;
  titulo: string;
  render: (fila: T) => ReactNode;
  /** En móvil, esta columna hace de título de la tarjeta. Una por tabla. */
  principal?: boolean;
  alinear?: "izquierda" | "derecha";
  /** Clases extra de la celda en escritorio (ancho, énfasis). */
  className?: string;
};

export type TablaResponsivaProps<T> = {
  columnas: ColumnaTabla<T>[];
  filas: T[];
  claveFila: (fila: T) => string;
  /** Descripción de la tabla para lectores de pantalla. */
  caption: string;
  /** Punto de quiebre desde el que se muestra como tabla. */
  desde?: "md" | "lg";
  className?: string;
};

/**
 * Tabla en escritorio, tarjetas apiladas en móvil. Una tabla de cuatro
 * columnas a 360px no se lee: aquí cada fila pasa a ser una tarjeta con la
 * columna principal como título y las demás como pares nombre/valor.
 *
 * Se renderizan los dos árboles y la media query decide cuál se ve, así el
 * HTML del servidor coincide con el del cliente. Con filas vacías no pinta
 * nada: el estado vacío lo decide quien la usa.
 */
export function TablaResponsiva<T>({
  columnas,
  filas,
  claveFila,
  caption,
  desde = "md",
  className,
}: TablaResponsivaProps<T>) {
  if (filas.length === 0) return null;

  const principal = columnas.find((c) => c.principal) ?? columnas[0];
  const secundarias = columnas.filter((c) => c !== principal);
  const tabla = desde === "md" ? "hidden md:table" : "hidden lg:table";
  const tarjetas = desde === "md" ? "md:hidden" : "lg:hidden";

  return (
    <div className={className}>
      <table className={cn(tabla, "w-full border-collapse text-left")}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b-2 border-gris-borde text-sm text-texto-sec">
            {columnas.map((columna) => (
              <th
                key={columna.clave}
                scope="col"
                className={cn(
                  "py-3 pr-4 font-semibold uppercase tracking-wide",
                  columna.alinear === "derecha" && "text-right",
                  columna.className,
                )}
              >
                {columna.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={claveFila(fila)} className="border-b border-gris-borde">
              {columnas.map((columna) => (
                <td
                  key={columna.clave}
                  className={cn(
                    "py-4 pr-4 align-top",
                    columna.alinear === "derecha" && "text-right",
                    columna === principal && "font-semibold text-azul-profundo",
                    columna.className,
                  )}
                >
                  {columna.render(fila)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className={cn(tarjetas, "flex flex-col gap-3")} aria-label={caption}>
        {filas.map((fila) => (
          <li key={claveFila(fila)} className="rounded-lg border border-gris-borde bg-blanco p-4">
            {principal && (
              <p className="font-semibold text-azul-profundo">{principal.render(fila)}</p>
            )}
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              {secundarias.map((columna) => (
                <div key={columna.clave} className="contents">
                  <dt className="text-texto-sec">{columna.titulo}</dt>
                  <dd className="text-azul-profundo">{columna.render(fila)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
