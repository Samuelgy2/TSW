import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Aviso, Boton } from "@/components/ui";
import { RUTA_PANEL, RUTA_VERIFICAR_MFA, exigirAdminParaMfa } from "@/lib/auth";
import { cerrarSesion } from "@/features/admin/acciones";
import { ActivarMfa } from "@/features/admin/components/ActivarMfa";

export const metadata: Metadata = { title: "Seguridad de la cuenta" };

/**
 * Activación del segundo factor. Es obligatoria: el panel no abre hasta
 * completarla (exigirAdminPagina manda aquí a quien aún no tiene factor).
 */
export default async function PaginaSeguridad() {
  const { mfa } = await exigirAdminParaMfa("/admin/seguridad");
  if (mfa === "verificar") redirect(RUTA_VERIFICAR_MFA);

  return (
    <>
      <h1 className="text-2xl">Activa la verificación en dos pasos</h1>
      <p className="mt-2 mb-6 text-sm text-texto-sec">
        Para entrar al panel hace falta, además de la contraseña, un código de una app de
        autenticación en tu teléfono.
      </p>

      {mfa === "ok" ? (
        <Aviso tono="exito" titulo="Ya está activa">
          Tu cuenta tiene verificación en dos pasos.{" "}
          <a href={RUTA_PANEL} className="underline underline-offset-4">Ir al panel</a>
        </Aviso>
      ) : (
        <ActivarMfa />
      )}

      <form action={cerrarSesion} className="mt-4 text-center">
        <Boton type="submit" variante="fantasma">Salir</Boton>
      </form>
    </>
  );
}
