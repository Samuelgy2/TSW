"use client";

import { Aviso } from "@/components/ui";
import { FormularioAcceso } from "./FormularioAcceso";

export type AccesoAdminProps = {
  redirigir?: string;
  /** La sesión se cerró por inactividad: se avisa al volver a la puerta. */
  expirada?: boolean;
};

/** Puerta del panel: correo y contraseña. */
export function AccesoAdmin({ redirigir, expirada }: AccesoAdminProps) {
  return (
    <>
      <h1 className="text-2xl">Acceso al panel</h1>
      <p className="mt-2 mb-6 text-sm text-texto-sec">Solo para la administración del club.</p>
      {expirada && (
        <Aviso tono="info" className="mb-6">
          Tu sesión se cerró por inactividad. Vuelve a entrar.
        </Aviso>
      )}
      <FormularioAcceso redirigir={redirigir} />
    </>
  );
}
