import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type TonoAviso = "error" | "exito" | "aviso" | "info";

const TONOS: Record<TonoAviso, string> = {
  error: "border-rojo/40 bg-rojo/5 text-rojo-oscuro",
  exito: "border-exito/30 bg-exito-fondo text-exito",
  aviso: "border-aviso/30 bg-aviso-fondo text-aviso",
  info: "border-gris-borde bg-gris-frio text-azul-profundo",
};

export type AvisoProps = {
  tono?: TonoAviso;
  titulo?: string;
  children: ReactNode;
  className?: string;
};

/**
 * Mensaje en línea: error de un formulario, confirmación de guardado,
 * advertencia antes de una acción. `role="alert"` en error para que el lector
 * de pantalla lo anuncie; `status` en los demás.
 */
export function Aviso({ tono = "info", titulo, children, className }: AvisoProps) {
  return (
    <div
      role={tono === "error" ? "alert" : "status"}
      className={cn("rounded-md border px-4 py-3 text-sm", TONOS[tono], className)}
    >
      {titulo && <p className="font-semibold">{titulo}</p>}
      <div className={cn(titulo && "mt-1")}>{children}</div>
    </div>
  );
}
