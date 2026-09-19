"use client";

import { useId, useState, type ChangeEvent } from "react";

import { cn } from "@/lib/utils";

export type StepperProps = {
  etiqueta: string;
  valor: number;
  alCambiar: (valor: number) => void;
  min?: number;
  max?: number;
  /** Texto de ayuda, p. ej. "Quedan 3 unidades". */
  ayuda?: string;
  disabled?: boolean;
  className?: string;
};

const BOTON =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-md border-2 border-gris-borde " +
  "bg-blanco text-xl font-bold leading-none text-azul-profundo transition-colors " +
  "hover:border-azul-medio focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo " +
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gris-borde";

/**
 * Cantidad con botones de menos y más. Los tres controles miden 44 px con
 * 8 px de separación, y el campo abre el teclado numérico en el celular.
 * También se puede teclear el número; al salir del campo se ajusta al rango.
 */
export function Stepper({
  etiqueta,
  valor,
  alCambiar,
  min = 1,
  max = 99,
  ayuda,
  disabled = false,
  className,
}: StepperProps) {
  const id = useId();
  // Texto en edición: permite borrar el campo sin que salte al mínimo.
  const [borrador, setBorrador] = useState<string | null>(null);

  function ajustar(candidato: number) {
    if (Number.isNaN(candidato)) return min;
    return Math.min(max, Math.max(min, Math.trunc(candidato)));
  }

  function alEscribir(evento: ChangeEvent<HTMLInputElement>) {
    const texto = evento.target.value.replace(/\D/g, "");
    setBorrador(texto);
    if (texto !== "") alCambiar(ajustar(Number(texto)));
  }

  function alSalir() {
    alCambiar(ajustar(Number(borrador ?? valor)));
    setBorrador(null);
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-azul-profundo">
        {etiqueta}
      </label>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => alCambiar(ajustar(valor - 1))}
          disabled={disabled || valor <= min}
          aria-label="Reducir cantidad"
          className={BOTON}
        >
          <span aria-hidden="true">−</span>
        </button>

        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={borrador ?? valor}
          disabled={disabled}
          onChange={alEscribir}
          onBlur={alSalir}
          aria-describedby={ayuda ? `${id}-ayuda` : undefined}
          // 16 px mínimo (text-base): por debajo, Safari en iOS hace zoom al enfocar.
          className={cn(
            "h-11 w-16 rounded-md border-2 border-gris-borde bg-blanco text-center text-base font-semibold text-azul-profundo",
            "focus:border-azul-medio focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo",
            "disabled:cursor-not-allowed disabled:bg-gris-frio disabled:opacity-70",
          )}
        />

        <button
          type="button"
          onClick={() => alCambiar(ajustar(valor + 1))}
          disabled={disabled || valor >= max}
          aria-label="Aumentar cantidad"
          className={BOTON}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>

      {ayuda && (
        <p id={`${id}-ayuda`} className="text-sm text-texto-sec">
          {ayuda}
        </p>
      )}
    </div>
  );
}
