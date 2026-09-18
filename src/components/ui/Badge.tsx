import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type TonoBadge = "neutro" | "acento" | "exito" | "aviso" | "oscuro";

const TONOS: Record<TonoBadge, string> = {
  neutro: "bg-gris-frio text-texto-sec border-gris-borde",
  // Rojo como acento: fondo tenue y texto oscuro para no perder contraste.
  acento: "bg-rojo/10 text-rojo-oscuro border-rojo/30",
  exito: "bg-emerald-50 text-emerald-800 border-emerald-200",
  aviso: "bg-amber-50 text-amber-900 border-amber-200",
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
