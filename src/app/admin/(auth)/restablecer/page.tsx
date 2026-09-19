import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { obtenerUsuario } from "@/lib/auth";
import { FormularioNuevaContrasena } from "@/features/admin/components/FormularioNuevaContrasena";

export const metadata: Metadata = { title: "Nueva contraseña" };

/**
 * Llega desde el enlace de recuperación, ya con sesión. Sin sesión el enlace
 * venció o no se pasó por el callback: se vuelve a pedir uno.
 */
export default async function PaginaRestablecer() {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect("/admin/recuperar?error=enlace");

  return (
    <>
      <h1 className="text-2xl">Nueva contraseña</h1>
      <p className="mt-2 mb-6 text-sm text-texto-sec">Para la cuenta {usuario.email}.</p>
      <FormularioNuevaContrasena />
    </>
  );
}
