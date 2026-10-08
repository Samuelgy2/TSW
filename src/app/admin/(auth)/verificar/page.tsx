import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Boton } from "@/components/ui";
import { RUTA_ACTIVAR_MFA, destinoSeguro, exigirAdminParaMfa } from "@/lib/auth";
import { cerrarSesion } from "@/features/admin/acciones";
import { verificarMfa } from "@/features/admin/acciones-mfa";
import { FormularioCodigoMfa } from "@/features/admin/components/FormularioCodigoMfa";

export const metadata: Metadata = { title: "Verificación en dos pasos" };

/** Segundo paso del acceso: el código de la app de autenticación. */
export default async function PaginaVerificarMfa({
  searchParams,
}: {
  searchParams: Promise<{ redirigir?: string }>;
}) {
  const { redirigir } = await searchParams;
  const { mfa } = await exigirAdminParaMfa("/admin/verificar");
  if (mfa === "ok") redirect(destinoSeguro(redirigir));
  if (mfa === "activar") redirect(RUTA_ACTIVAR_MFA);

  return (
    <>
      <h1 className="text-2xl">Verificación en dos pasos</h1>
      <p className="mt-2 mb-6 text-sm text-texto-sec">
        Escribe el código de 6 dígitos que muestra tu app de autenticación.
      </p>
      <FormularioCodigoMfa
        etiquetaBoton="Verificar"
        alEnviar={async (codigo) => {
          "use server";
          return verificarMfa({ codigo, redirigir });
        }}
      />
      <form action={cerrarSesion} className="mt-4 text-center">
        <Boton type="submit" variante="fantasma">Salir</Boton>
      </form>
    </>
  );
}
