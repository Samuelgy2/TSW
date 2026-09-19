import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type TonoBadge = "neutro" | "acento" | "exito" | "aviso" | "oscuro";

const TONOS: Record<TonoBadge, string> = {
  neutro: "bg-gris-frio text-texto-sec border-gris-borde",
  // Rojo como acento: fondo tenue y texto oscuro para no perder contraste.
  acento: "bg-rojo/10 text-rojo-oscuro border-rojo/30",
  // Colores funcionales de globals.css. Medidos: exito 4.69:1, aviso 5.41:1.
  exito: "bg-exito-fondo text-exito border-exito/30",
  aviso: "bg-aviso-fondo text-aviso border-aviso/30",
  oscuro: "bg-azul-profundo text-blanco border-azul-profundo",
};

export type BadgeProps = {
  children: ReactNode;
  tono?: TonoBadge;
  className?: string;
};

export function Badge({ children, tono = "neutro", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        TONOS[tono],
        className,
      )}
    >
      {children}
    </span>
  );
}
