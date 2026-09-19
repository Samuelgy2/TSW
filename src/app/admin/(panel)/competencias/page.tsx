import type { Metadata } from "next";

import { PaginaPanel } from "@/components/admin/PaginaPanel";
import { SECCIONES_PANEL } from "@/config/panel";
import { exigirSesionPagina } from "@/lib/auth";
import { CompetenciasAdmin } from "@/features/admin/components/CompetenciasAdmin";
import { listarCompetenciasPanel } from "@/features/admin/queries";

export const metadata: Metadata = { title: "Competencias" };

const SECCION = SECCIONES_PANEL.find((s) => s.href === "/admin/competencias");

/** Competencias: borradores, publicadas y archivadas, con sus resultados. */
export default async function PaginaCompetenciasPanel() {
  await exigirSesionPagina("/admin/competencias");
  const competencias = await listarCompetenciasPanel();

  return (
    <PaginaPanel titulo="Competencias" descripcion={SECCION?.descripcion}>
      <CompetenciasAdmin competencias={competencias} />
    </PaginaPanel>
  );
}
