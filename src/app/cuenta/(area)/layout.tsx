import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Aviso, Boton } from "@/components/ui";
import { ExpulsorInactividad } from "@/components/auth/ExpulsorInactividad";
import { Footer } from "@/components/layout/Footer";
import { cerrarSesionUsuario } from "@/features/cuenta/acciones";
import { cuentasHabilitadas } from "@/lib/auth/rutas";

export const metadata: Metadata = {
  title: { default: "Mi cuenta", template: "%s | Mi cuenta TSW" },
  robots: { index: false, follow: false },
};

/**
 * Área de usuario. Cabecera ligera con el cierre de sesión real (Server
 * Action) y el pie compartido del sitio.
 *
 * La verificación de perfil NO vive solo aquí: cada página llama a
 * exigirUsuarioPagina, porque Next no re-ejecuta el layout al navegar entre
 * páginas hermanas. El aviso de muestra sigue porque mensualidades y jerseys
 * todavía se sirven de datos de muestra hasta la migración siguiente.
 */
export default function LayoutCuenta({ children }: { children: ReactNode }) {
  // Segunda capa del apagado de /cuenta/* (la primera es el middleware).
  if (!cuentasHabilitadas()) notFound();

  return (
    <div className="flex min-h-svh flex-col bg-gris-frio">
      <ExpulsorInactividad alExpirar={cerrarSesionUsuario} />
      <header className="border-b border-blanco/10 bg-azul-profundo text-blanco">
        <div className="contenedor flex h-16 items-center justify-between">
          <Link
            href="/cuenta"
            className="flex min-h-[44px] items-center font-display text-2xl tracking-tight focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
          >
            TSW
            <span className="ml-2 text-xs font-normal uppercase tracking-[0.2em] text-blanco/60">Mi cuenta</span>
          </Link>

          <form action={cerrarSesionUsuario}>
            <Boton type="submit" variante="fantasma">Salir</Boton>
          </form>
        </div>
      </header>

      <main id="contenido" tabIndex={-1} className="contenedor flex-1 py-8 sm:py-10 lg:py-12">
        <Aviso tono="info" className="mb-6">
          Mensualidades y jerseys se muestran con datos de muestra: su esquema llega en la siguiente etapa.
        </Aviso>
        {children}
      </main>

      <Footer />
    </div>
  );
}
