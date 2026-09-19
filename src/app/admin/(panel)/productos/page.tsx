import type { Metadata } from "next";

import { PaginaPanel } from "@/components/admin/PaginaPanel";
import { SECCIONES_PANEL } from "@/config/panel";
import { exigirSesionPagina } from "@/lib/auth";
import { ProductosAdmin } from "@/features/admin/components/ProductosAdmin";
import { listarProductosPanel } from "@/features/admin/queries";

export const metadata: Metadata = { title: "Productos" };

const SECCION = SECCIONES_PANEL.find((s) => s.href === "/admin/productos");

/** Productos: catálogo, variantes, precios e inventario. */
export default async function PaginaProductosPanel() {
  await exigirSesionPagina("/admin/productos");
  const productos = await listarProductosPanel();

  return (
    <PaginaPanel titulo="Productos" descripcion={SECCION?.descripcion}>
      <ProductosAdmin productos={productos} />
    </PaginaPanel>
  );
}
