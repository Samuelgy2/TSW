import type { ReactNode } from "react";

import { BarraSuperior } from "@/components/layout/BarraSuperior";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { TransicionPagina } from "@/components/layout/TransicionPagina";

export default function LayoutPublico({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Primer elemento focalizable de la página: salta la navegación. */}
      <a href="#contenido" className="salto-contenido">
        Saltar al contenido
      </a>

      <BarraSuperior />
      <Header />

      <main id="contenido" tabIndex={-1}>
        <TransicionPagina>{children}</TransicionPagina>
      </main>

      <Footer />
    </>
  );
}
