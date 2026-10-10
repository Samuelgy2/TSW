"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { SelectorDeporte } from "@/components/ui";

export type OpcionClub = { slug: string; nombre: string };

export type SelectorClubPublicoProps = {
  clubes: OpcionClub[];
  /** Slug del club activo, resuelto en el servidor desde la ruta. */
  valor: string;
  /** Sobre el HeroPagina oscuro va la paleta oscura del selector. */
  fondo?: "oscuro" | "claro";
};

/**
 * Elegir club navega a `/semilleros/<slug>`.
 *
 * Reutiliza el primitivo `SelectorDeporte` de `/laboratorio` tal cual: mismo
 * desplegable en escritorio, misma hoja inferior en móvil, mismo teclado. Lo
 * único que cambia es qué lista muestra, así que crear un primitivo gemelo
 * sería duplicar el patrón de foco y de flechas para nada. El `id` del
 * primitivo se alimenta con el slug: es lo que va en la URL.
 *
 * No usa `useSearchParams` —obligaría a un Suspense en cada página que lo
 * monte—: el valor llega resuelto del servidor.
 */
export function SelectorClubPublico({ clubes, valor, fondo = "claro" }: SelectorClubPublicoProps) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();

  // Con un solo club el selector no ofrece ninguna decisión: sobra.
  if (clubes.length < 2) return null;

  return (
    <div aria-busy={pendiente || undefined} className="flex flex-col gap-1.5">
      <span className="text-xs font-bold uppercase tracking-[0.15em] opacity-70">Club o programa</span>
      <SelectorDeporte
        deportes={clubes.map((c) => ({ id: c.slug, nombre: c.nombre }))}
        valor={valor}
        fondo={fondo}
        alCambiar={(slug) => iniciar(() => router.push(`/semilleros/${encodeURIComponent(slug)}`, { scroll: false }))}
      />
    </div>
  );
}
