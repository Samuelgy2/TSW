import "server-only";

import { headers } from "next/headers";

/**
 * IP del cliente. `x-vercel-forwarded-for` la fija la plataforma y el cliente no
 * puede falsearla; `x-forwarded-for` solo sirve en local o detrás de un proxy
 * propio de confianza.
 */
export async function ipDelCliente(): Promise<string> {
  const cabeceras = await headers();
  return (
    cabeceras.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    cabeceras.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    cabeceras.get("x-real-ip") ||
    "desconocida"
  );
}
