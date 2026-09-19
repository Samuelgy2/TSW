import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Contenedor } from "./Contenedor";

export type HeroPaginaProps = {
  titulo: string;
  /** Una o dos frases bajo el título. */
  bajada?: ReactNode;
  /** Etiqueta corta sobre el título: "Formación", "Catálogo". */
  antetitulo?: string;
  tono?: "oscuro" | "claro";
  /** Bloque a la derecha en escritorio, debajo en móvil: un filtro, un CTA. */
  lateral?: ReactNode;
  /** Migas de pan u otro contenido sobre el título. */
  encabezado?: ReactNode;
  className?: string;
};

/**
 * Cabecera de página interior. Server Component. El `h1` de la página va
 * aquí y solo aquí. Oscuro para matrículas y carrito, claro para lo demás.
 */
export function HeroPagina({
  titulo,
  bajada,
  antetitulo,
  tono = "claro",
  lateral,
  encabezado,
  className,
}: HeroPaginaProps) {
  const oscuro = tono === "oscuro";
  return (
    <div
      className={cn(
        oscuro ? "bg-azul-profundo text-blanco" : "bg-gris-frio text-azul-profundo",
        "py-12 sm:py-16 lg:py-20",
        className,
      )}
    >
      <Contenedor>
        {encabezado && <div className="mb-6">{encabezado}</div>}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            {antetitulo && (
              <p
                className={cn(
                  "mb-3 text-xs font-bold uppercase tracking-[0.2em]",
                  // Rojo sobre azul profundo no alcanza AA en texto pequeño:
                  // sobre oscuro va como chip blanco sobre rojo, igual que en el hero.
                  oscuro ? "inline-block bg-rojo px-3 py-1 text-blanco" : "text-rojo-oscuro",
                )}
              >
                {antetitulo}
              </p>
            )}
            <h1 className="titulo-pagina">{titulo}</h1>
            {bajada && (
              <p className={cn("mt-4 max-w-2xl text-lg sm:text-xl", oscuro ? "text-blanco/85" : "text-texto-sec")}>
                {bajada}
              </p>
            )}
          </div>
          {lateral && <div className="shrink-0">{lateral}</div>}
        </div>
      </Contenedor>
    </div>
  );
}
