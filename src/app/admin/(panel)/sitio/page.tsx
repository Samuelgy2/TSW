import type { Metadata } from "next";

import { PaginaPanel } from "@/components/admin/PaginaPanel";
import { SECCIONES_PANEL } from "@/config/panel";
import { exigirAdminPagina } from "@/lib/auth";
import { contenidoParaPanel, ultimasEdicionesContenido } from "@/features/admin/queries-contenido";
import { SitioAdmin } from "@/features/sitio/components/SitioAdmin";

export const metadata: Metadata = { title: "Contenido del sitio" };

const SECCION = SECCIONES_PANEL.find((s) => s.href === "/admin/sitio");

/**
 * Contenido editable del sitio público (migración 19): portada, matrículas,
 * semilleros y tienda, hoy fijos en config/contenido.ts. Cada sección se
 * guarda entera en `contenido_sitio` cuando el admin la personaliza; sin
 * personalizar, el sitio sigue mostrando el código de siempre.
 */
export default async function PaginaSitioPanel() {
  await exigirAdminPagina("/admin/sitio");
  const [contenidoInicial, ediciones] = await Promise.all([
    contenidoParaPanel(),
    ultimasEdicionesContenido(),
  ]);

  return (
    <PaginaPanel titulo="Contenido del sitio" descripcion={SECCION?.descripcion}>
      <SitioAdmin contenidoInicial={contenidoInicial} ediciones={ediciones} />
    </PaginaPanel>
  );
}
