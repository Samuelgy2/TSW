import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Boton } from "./Boton";

export type ItemDescargaProps = {
  titulo: string;
  descripcion?: ReactNode;
  /** Datos cortos bajo el título: versión, fecha, tamaño. Se separan con puntos. */
  meta?: string[];
  /** URL del archivo. Sin ella, el botón no se muestra y se avisa que falta. */
  href?: string;
  /** Nombre con el que se guarda el archivo. */
  nombreArchivo?: string;
  etiquetaBoton?: string;
  className?: string;
};

/**
 * Fila de archivo descargable: título, datos y botón de descarga. El botón es
 * un `<a download>` real, así el navegador guarda el archivo con su nombre y
 * el enlace se puede copiar o abrir en otra pestaña.
 */
export function ItemDescarga({
  titulo,
  descripcion,
  meta = [],
  href,
  nombreArchivo,
  etiquetaBoton = "Descargar PDF",
  className,
}: ItemDescargaProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-gris-borde bg-blanco p-5 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="text-lg leading-tight">{titulo}</h3>
        {descripcion && <p className="mt-1 text-texto-sec">{descripcion}</p>}
        {meta.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-x-2 text-sm text-texto-sec">
            {meta.map((dato, i) => (
              <span key={dato} className="whitespace-nowrap">
                {dato}
                {i < meta.length - 1 && (
                  <span aria-hidden="true" className="ml-2">
                    ·
                  </span>
                )}
              </span>
            ))}
          </p>
        )}
      </div>

      {href ? (
        <Boton asChild variante="secundario" className="shrink-0">
          <a href={href} download={nombreArchivo}>
            {etiquetaBoton}
            <span className="sr-only">: {titulo}</span>
          </a>
        </Boton>
      ) : (
        <p className="shrink-0 text-sm font-semibold text-texto-sec">Archivo pendiente de publicar</p>
      )}
    </div>
  );
}
