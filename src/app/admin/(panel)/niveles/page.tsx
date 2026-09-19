import type { Metadata } from "next";

import { PaginaPanel } from "@/components/admin/PaginaPanel";
import { SECCIONES_PANEL } from "@/config/panel";
import { exigirSesionPagina } from "@/lib/auth";
import { NivelesAdmin } from "@/features/admin/components/NivelesAdmin";
import { listarNivelesPanel } from "@/features/admin/queries";

export const metadata: Metadata = { title: "Niveles" };

const SECCION = SECCIONES_PANEL.find((s) => s.href === "/admin/niveles");

/** Niveles y semilleros: orden de la ruta formativa, edades y horarios. */
export default async function PaginaNivelesPanel() {
  await exigirSesionPagina("/admin/niveles");
  const niveles = await listarNivelesPanel();

  return (
    <PaginaPanel titulo="Niveles" descripcion={SECCION?.descripcion}>
      <NivelesAdmin niveles={niveles} />
    </PaginaPanel>
  );
}
