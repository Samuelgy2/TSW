import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RUTA_PANEL, obtenerUsuario } from "@/lib/auth";
import { FormularioAcceso } from "@/features/admin/components/FormularioAcceso";

export const metadata: Metadata = { title: "Acceso" };

/** Acceso al panel. Con sesión activa no hay nada que hacer aquí. */
export default async function PaginaAcceso({
  searchParams,
}: {
  searchParams: Promise<{ redirigir?: string }>;
}) {
  if (await obtenerUsuario()) redirect(RUTA_PANEL);
  const { redirigir } = await searchParams;

  return (
    <>
      <h1 className="text-2xl">Acceso al panel</h1>
      <p className="mt-2 mb-6 text-sm text-texto-sec">Solo para la administración del club.</p>
      <FormularioAcceso redirigir={redirigir} />
    </>
  );
}
