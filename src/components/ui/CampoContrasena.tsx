"use client";

import { forwardRef, useId, useState } from "react";

import { cn } from "@/lib/utils";
import { CLASES_CONTROL, EnvolturaCampo, clasesBorde, type CampoProps } from "./Campo";

/**
 * Campo de contraseña con ojo para ver u ocultar lo escrito, dentro del
 * contenedor. El estado es interno: quien lo usa no tiene que llevarlo. El
 * botón mide 44×44 y no es parte del orden natural del formulario salvo por
 * teclado (Tab lo alcanza), con `aria-pressed` y etiqueta que cambia.
 */
export const CampoContrasena = forwardRef<HTMLInputElement, Omit<CampoProps, "type" | "inputMode">>(
  function CampoContrasena({ etiqueta, ayuda, error, className, required, ...resto }, ref) {
    const id = useId();
    const [visible, setVisible] = useState(false);
    const descripcion = error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined;

    return (
      <EnvolturaCampo id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} requerido={required} className={className}>
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={visible ? "text" : "password"}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={descripcion}
            className={cn(CLASES_CONTROL, clasesBorde(Boolean(error)), "pr-12")}
            {...resto}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-texto-sec hover:text-azul-profundo focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {visible ? (
                <>
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                  <path d="M9.9 5.1A10.4 10.4 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3.2 4.1M6.1 6.1A16.6 16.6 0 0 0 2.5 12S6 19 12 19a10 10 0 0 0 4.2-.9" />
                </>
              ) : (
                <>
                  <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
        </div>
      </EnvolturaCampo>
    );
  },
);
