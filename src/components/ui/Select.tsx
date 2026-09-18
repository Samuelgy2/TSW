"use client";

import { forwardRef, useId, type SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";
import { CLASES_CONTROL, EnvolturaCampo, clasesBorde } from "./Campo";

export type OpcionSelect = {
  valor: string;
  etiqueta: string;
  deshabilitada?: boolean;
};

export type SelectProps = {
  etiqueta: string;
  opciones: OpcionSelect[];
  ayuda?: string;
  error?: string;
  /** Opción vacía inicial, p. ej. "Selecciona una talla". */
  marcador?: string;
  className?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "id" | "children">;

/**
 * `select` nativo: se comporta bien con teclado y lectores de pantalla en
 * cualquier dispositivo, y en móvil abre el selector del sistema.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { etiqueta, opciones, ayuda, error, marcador, className, required, ...resto },
  ref,
) {
  const id = useId();
  const descripcion = error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined;

  return (
    <EnvolturaCampo
      id={id}
      etiqueta={etiqueta}
      ayuda={ayuda}
      error={error}
      requerido={required}
      className={className}
    >
      <div className="relative">
        <select
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={descripcion}
          className={cn(CLASES_CONTROL, clasesBorde(Boolean(error)), "appearance-none pr-10")}
          {...resto}
        >
          {marcador && (
            <option value="" disabled>
              {marcador}
            </option>
          )}
          {opciones.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor} disabled={opcion.deshabilitada}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>

        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-texto-sec"
        >
          ▾
        </span>
      </div>
    </EnvolturaCampo>
  );
});
