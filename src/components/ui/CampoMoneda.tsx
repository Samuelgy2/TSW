"use client";

import { useId, useState, type ChangeEvent } from "react";

import { cn } from "@/lib/utils";
import { centavosAPesos, pesosACentavos } from "@/lib/utils/formato";
import { CLASES_CONTROL, clasesBorde } from "./Campo";

export type CampoMonedaProps = {
  etiqueta: string;
  /** Valor en centavos de COP: la unidad de la base de datos. */
  valorCentavos: number;
  alCambiar: (centavos: number) => void;
  ayuda?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

/**
 * Campo de precio en pesos colombianos. El resto del sistema habla en
 * centavos —la unidad de la base—, así que aquí está la frontera: se muestra
 * con centavosAPesos y se entrega con pesosACentavos. Ningún componente del
 * panel multiplica ni divide por su cuenta: la conversión ocurre en un solo
 * lugar, formato.ts, y este campo la usa.
 *
 * Acepta decimales al teclear (45000,5) y redondea al enviar; formatea con
 * separador de miles al salir del campo para que el error de un cero de más
 * se vea antes de guardar.
 */
export function CampoMoneda({
  etiqueta,
  valorCentavos,
  alCambiar,
  ayuda,
  error,
  disabled = false,
  required = false,
  className,
}: CampoMonedaProps) {
  const id = useId();
  // Texto en edición: permite borrar el campo sin que salte a cero.
  const [borrador, setBorrador] = useState<string | null>(null);

  const textoFormateado = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(
    centavosAPesos(valorCentavos),
  );

  function alEscribir(evento: ChangeEvent<HTMLInputElement>) {
    // Solo dígitos, punto y coma decimal: lo demás es basura de teclado.
    const limpio = evento.target.value.replace(/[^\d.,]/g, "").replace(",", ".");
    setBorrador(limpio);

    const numero = Number(limpio);
    if (limpio !== "" && !Number.isNaN(numero)) alCambiar(pesosACentavos(numero));
  }

  function alSalir() {
    const numero = Number(borrador ?? "");
    if (borrador === null || borrador === "" || Number.isNaN(numero)) {
      alCambiar(0);
    } else {
      alCambiar(pesosACentavos(numero));
    }
    setBorrador(null);
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-azul-profundo">
        {etiqueta}
        {required && (
          <span className="ml-1 text-rojo" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only"> (obligatorio)</span>}
      </label>

      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-sec"
        >
          $
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          // 16 px mínimo: por debajo, Safari en iOS hace zoom al enfocar.
          className={cn(CLASES_CONTROL, clasesBorde(Boolean(error)), "pl-7")}
          value={borrador ?? textoFormateado}
          onChange={alEscribir}
          onBlur={alSalir}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined}
        />
      </div>

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
