import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ArmazonPanel } from "@/components/admin/ArmazonPanel";
import { exigirSesionPagina } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s | Panel TSW" },
  robots: { index: false, follow: false },
};

/**
 * Armazón del panel. Verifica la sesión, pero cada página lo vuelve a hacer:
 * Next no re-ejecuta el layout al navegar entre páginas hermanas, así que la
 * comprobación de aquí solo cubre la primera carga.
 */
export default async function LayoutPanel({ children }: { children: ReactNode }) {
  const { usuario } = await exigirSesionPagina("/admin");
  return <ArmazonPanel correo={usuario.email ?? "administrador"}>{children}</ArmazonPanel>;
}
