import type { Metadata } from "next";

import { PaginaPanel } from "@/components/admin/PaginaPanel";
import { SECCIONES_PANEL } from "@/config/panel";
import { exigirSesionPagina } from "@/lib/auth";
import { DocumentosAdmin } from "@/features/admin/components/DocumentosAdmin";
import { listarDocumentosPanel } from "@/features/admin/queries";

export const metadata: Metadata = { title: "Documentos" };

const SECCION = SECCIONES_PANEL.find((s) => s.href === "/admin/documentos");

/** Documentos de matrícula: contenido, versión vigente e historial. */
export default async function PaginaDocumentosPanel() {
  await exigirSesionPagina("/admin/documentos");
  const documentos = await listarDocumentosPanel();

  return (
    <PaginaPanel
      titulo="Documentos"
      descripcion={SECCION?.descripcion}
      // Sin botón de acción aquí: la acción principal vive dentro del módulo,
      // junto a cada documento ("Publicar versión").
    >
      <DocumentosAdmin documentos={documentos} />
    </PaginaPanel>
  );
}
