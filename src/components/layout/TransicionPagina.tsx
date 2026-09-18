"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AnimatePresence, motion, useMovimientoReducido } from "@/lib/animaciones";

/**
 * Transición entre páginas: una atenuación corta, sin desplazamiento vertical,
 * para que el contenido no se mueva bajo el dedo mientras se lee.
 *
 * El envoltorio `motion.div` está SIEMPRE, en servidor y en cliente. Lo que
 * cambia con el movimiento reducido son las props de animación, no la
 * estructura: quitar o poner un elemento según una media query que solo existe
 * en el navegador rompe la hidratación.
 *
 * `initial={false}` en AnimatePresence evita que la primera página entre
 * atenuándose: el HTML del servidor ya sale opaco y legible.
 */
export function TransicionPagina({ children }: { children: ReactNode }) {
  const ruta = usePathname();
  const reducido = useMovimientoReducido();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={ruta}
        initial={reducido ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reducido ? undefined : { opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
