"use client";

import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type Compartidas = {
  etiqueta: string;
  /** Texto de ayuda bajo el campo. Se enlaza con aria-describedby. */
  ayuda?: string;
  /** Mensaje de error. Marca el campo como inválido. */
  error?: string;
  className?: string;
};

const CONTROL =
  "w-full min-h-[44px] rounded-md border-2 bg-blanco px-3 py-2 text-base text-azul-profundo " +
  "placeholder:text-texto-sec/70 transition-colors " +
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo " +
  "disabled:cursor-not-allowed disabled:bg-gris-frio disabled:opacity-70";

function bordes(hayError: boolean) {
  return hayError ? "border-rojo" : "border-gris-borde focus:border-azul-medio";
}

/** Etiqueta, ayuda y error, cableados por id. Lo usan Campo, AreaTexto y Select. */
function Envoltura({
  id,
  etiqueta,
  ayuda,
  error,
  requerido,
  children,
  className,
}: Compartidas & { id: string; requerido?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-azul-profundo">
        {etiqueta}
        {requerido && (
          <span className="ml-1 text-rojo" aria-hidden="true">
            *
          </span>
        )}
        {requerido && <span className="sr-only"> (obligatorio)</span>}
      </label>

      {children}

      {ayuda && !error && (
        <p id={`${id}-ayuda`} className="text-sm text-texto-sec">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-rojo">
          {error}
        </p>
      )}
    </div>
  );
}

export type CampoProps = Compartidas &
  Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "id">;

export const Campo = forwardRef<HTMLInputElement, CampoProps>(function Campo(
  { etiqueta, ayuda, error, className, required, ...resto },
  ref,
) {
  const id = useId();
  const descripcion = error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined;

  return (
    <Envoltura id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} requerido={required} className={className}>
      <input
        ref={ref}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={descripcion}
        className={cn(CONTROL, bordes(Boolean(error)))}
        {...resto}
      />
    </Envoltura>
  );
});

export type AreaTextoProps = Compartidas &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "id">;

export const AreaTexto = forwardRef<HTMLTextAreaElement, AreaTextoProps>(function AreaTexto(
  { etiqueta, ayuda, error, className, required, rows = 4, ...resto },
  ref,
) {
  const id = useId();
  const descripcion = error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined;

  return (
    <Envoltura id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} requerido={required} className={className}>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={descripcion}
        className={cn(CONTROL, bordes(Boolean(error)), "resize-y")}
        {...resto}
      />
    </Envoltura>
  );
});

export { Envoltura as EnvolturaCampo, CONTROL as CLASES_CONTROL, bordes as clasesBorde };
