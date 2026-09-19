"use client";

import { useEffect } from "react";

import { Boton } from "./Boton";
import { Contenedor } from "./Contenedor";

export type EstadoErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  /** Qué falló, en palabras del visitante: "los documentos de matrícula". */
  contexto: string;
};

/**
 * Cuerpo de los `error.tsx` de cada ruta. Next lo monta dentro del layout, así
 * que header y footer siguen ahí; esto solo reemplaza el contenido. Ofrece
 * reintentar y volver al inicio, sin volcar el mensaje técnico al visitante.
 */
export function EstadoError({ error, reset, contexto }: EstadoErrorProps) {
  useEffect(() => {
    // En producción irá a un servicio de registro; por ahora, consola.
    console.error(error);
  }, [error]);

  return (
    <Contenedor className="py-16 lg:py-24">
      <div role="alert" className="mx-auto max-w-lg text-center">
        <h1 className="text-3xl sm:text-4xl">Algo salió mal</h1>
        <p className="mt-4 text-texto-sec">
          No pudimos cargar {contexto}. Puede ser un problema pasajero de conexión.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Boton onClick={reset}>Volver a intentar</Boton>
          <Boton href="/" variante="secundario">
            Ir al inicio
          </Boton>
        </div>
      </div>
    </Contenedor>
  );
}
