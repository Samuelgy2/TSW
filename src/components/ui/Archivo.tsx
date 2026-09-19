"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";

import { cn } from "@/lib/utils";
import { MENSAJE_ERROR_ARCHIVO, formatearTamano, validarArchivo, type ErrorArchivo } from "@/lib/utils/archivos";

export type ArchivoProps = {
  etiqueta: string;
  /** Tipos MIME reales aceptados, verificados por firma de bytes. */
  mimesPermitidos: readonly string[];
  /** Etiquetas legibles de los tipos: "PDF", "JPG, PNG o WebP". */
  descripcionTipos: string;
  maximoBytes: number;
  /** Texto de ayuda bajo el campo: qué archivo se espera. */
  ayuda?: string;
  error?: string;
  /** Se ejecuta solo si el archivo pasó la validación de tipo y tamaño. */
  alSeleccionar: (archivo: File) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Campo de subida con validación de tipo MIME real (magic bytes, no la
 * extensión) y de tamaño, en el cliente antes de que salga el archivo.
 * El que valida de verdad es el servidor: esto es la primera pasada.
 *
 * Muestra el nombre, el tamaño y el tipo detectado del archivo elegido, y el
 * error concreto cuando algo falla. El `input` real queda visualmente oculto
 * pero accesible: la etiqueta es un botón que lo activa.
 */
export function Archivo({
  etiqueta,
  mimesPermitidos,
  descripcionTipos,
  maximoBytes,
  ayuda,
  error,
  alSeleccionar,
  disabled = false,
  className,
}: ArchivoProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [mimeDetectado, setMimeDetectado] = useState<string | null>(null);
  const [errorLocal, setErrorLocal] = useState<ErrorArchivo | null>(null);

  const descripcion = error ?? (errorLocal ? MENSAJE_ERROR_ARCHIVO[errorLocal] : undefined);
  const maximo = formatearTamano(maximoBytes);

  function alCambiar(evento: ChangeEvent<HTMLInputElement>) {
    const elegido = evento.target.files?.[0] ?? null;
    setArchivo(elegido);
    setMimeDetectado(null);
    setErrorLocal(null);

    if (!elegido) return;

    void validarArchivo(elegido, { mimesPermitidos, maximoBytes }).then((resultado) => {
      if (resultado.ok) {
        setMimeDetectado(resultado.mime);
        alSeleccionar(elegido);
      } else {
        setErrorLocal(resultado.error);
        evento.target.value = "";
        alSeleccionar(null as unknown as File);
      }
    });
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span id={`${id}-etiqueta`} className="text-sm font-semibold text-azul-profundo">
        {etiqueta}
        <span className="ml-1 text-rojo" aria-hidden="true">
          *
        </span>
        <span className="sr-only"> (obligatorio)</span>
      </span>

      <div
        className={cn(
          "rounded-md border-2 border-dashed p-4 transition-colors",
          descripcion ? "border-rojo bg-rojo/5" : "border-gris-borde bg-gris-frio",
        )}
      >
        <input
          ref={input}
          id={id}
          type="file"
          accept={mimesPermitidos.join(",")}
          onChange={alCambiar}
          disabled={disabled}
          aria-labelledby={`${id}-etiqueta`}
          aria-describedby={descripcion ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined}
          aria-invalid={descripcion ? true : undefined}
          className={cn(
            "block w-full text-sm text-texto-sec",
            "file:mr-3 file:min-h-[44px] file:cursor-pointer file:rounded-md file:border-0",
            "file:bg-azul-profundo file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blanco",
            "file:hover:bg-azul-medio file:disabled:cursor-not-allowed file:disabled:opacity-50",
            "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo",
            "disabled:cursor-not-allowed disabled:opacity-70",
          )}
        />

        {archivo && !descripcion && (
          <p className="mt-3 text-sm text-azul-profundo">
            <span className="font-semibold">{archivo.name}</span>{" "}
            <span className="text-texto-sec">
              · {formatearTamano(archivo.size)}
              {mimeDetectado && ` · ${mimeDetectado}`}
            </span>
          </p>
        )}

        <p className="mt-2 text-sm text-texto-sec">
          {descripcionTipos}, hasta {maximo}.
        </p>
      </div>

      {ayuda && !descripcion && (
        <p id={`${id}-ayuda`} className="text-sm text-texto-sec">
          {ayuda}
        </p>
      )}
      {descripcion && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-rojo">
          {descripcion}
        </p>
      )}
    </div>
  );
}
