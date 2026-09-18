import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ErrorApp } from "./errores";

/** Forma única de los errores que salen por la API. */
export type CuerpoError = {
  error: {
    codigo: string;
    mensaje: string;
    detalles?: Record<string, string[]>;
  };
};

/**
 * Traduce cualquier excepción a una respuesta HTTP en español.
 * Los errores no previstos se registran completos pero salen como 500
 * genérico: nunca se filtra al cliente el detalle interno.
 */
export function respuestaDeError(error: unknown): NextResponse<CuerpoError> {
  if (error instanceof ErrorApp) {
    return NextResponse.json<CuerpoError>(
      {
        error: {
          codigo: error.codigo,
          mensaje: error.message,
          ...(error.detalles ? { detalles: error.detalles } : {}),
        },
      },
      { status: error.estado },
    );
  }

  if (error instanceof ZodError) {
    const detalles: Record<string, string[]> = {};
    for (const problema of error.issues) {
      const campo = problema.path.join(".") || "_";
      detalles[campo] = [...(detalles[campo] ?? []), problema.message];
    }
    return NextResponse.json<CuerpoError>(
      {
        error: {
          codigo: "validacion",
          mensaje: "Los datos enviados no son válidos.",
          detalles,
        },
      },
      { status: 422 },
    );
  }

  console.error("[error no controlado]", error);
  return NextResponse.json<CuerpoError>(
    {
      error: {
        codigo: "interno",
        mensaje: "Algo salió mal de nuestro lado. Inténtalo de nuevo.",
      },
    },
    { status: 500 },
  );
}
