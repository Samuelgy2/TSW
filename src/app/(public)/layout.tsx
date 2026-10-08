import type { ReactNode } from "react";

import { BarraSuperior } from "@/components/layout/BarraSuperior";
import { BotonFlotanteWhatsApp } from "@/components/layout/BotonFlotanteWhatsApp";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { listarClubesParaMenu } from "@/features/clubes/queries";

export default async function LayoutPublico({ children }: { children: ReactNode }) {
  // Los clubes del menú se leen aquí, una vez por petición, y bajan al Header
  // como props: el Header es de cliente y no puede consultar la base.
  const clubes = await listarClubesParaMenu();

  return (
    <>
      {/* Primer elemento focalizable de la página: salta la navegación. */}
      <a href="#contenido" className="salto-contenido">
        Saltar al contenido
      </a>

      <BarraSuperior />
      <Header clubes={clubes} />

      <main id="contenido" tabIndex={-1}>
        {children}
      </main>

      <Footer />

      {/* Fuera del <main>: es una acción del sitio, no contenido de la página.
          Va al final del DOM para que el recorrido con teclado lo encuentre
          después del contenido y no antes. */}
      <BotonFlotanteWhatsApp />
    </>
  );
}
