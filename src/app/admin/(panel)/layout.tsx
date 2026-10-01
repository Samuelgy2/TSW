import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ArmazonPanel } from "@/components/admin/ArmazonPanel";
import { ExpulsorInactividad } from "@/components/auth/ExpulsorInactividad";
import { cerrarSesion } from "@/features/admin/acciones";
import { exigirAdminPagina } from "@/lib/auth";
import { deporteActivo, listarOpcionesSelectorPanel } from "@/features/cuenta/deporte-servidor";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s | Panel TSW" },
  robots: { index: false, follow: false },
};

/**
 * Armazón del panel. Verifica la sesión, pero cada página lo vuelve a hacer:
 * Next no re-ejecuta el layout al navegar entre páginas hermanas, así que la
 * comprobación de aquí solo cubre la primera carga.
 *
 * También lee el deporte activo de la cookie tsw.deporte y la lista de la
 * tabla `deporte` para el selector del armazón. Es preferencia de vista: no
 * filtra consultas todavía.
 */
export default async function LayoutPanel({ children }: { children: ReactNode }) {
  const { usuario } = await exigirAdminPagina("/admin");
  const [deporte, deportes] = await Promise.all([deporteActivo(), listarOpcionesSelectorPanel()]);

  return (
    <ArmazonPanel correo={usuario.email ?? "administrador"} deporte={deporte} deportes={deportes}>
      <ExpulsorInactividad alExpirar={cerrarSesion} />
      {children}
    </ArmazonPanel>
  );
}
