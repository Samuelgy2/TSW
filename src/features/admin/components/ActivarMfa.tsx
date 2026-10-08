"use client";

import Image from "next/image";
import { useState, useTransition } from "react";

import { Aviso, Boton } from "@/components/ui";
import { confirmarActivacionMfa, iniciarActivacionMfa, type ActivacionMfa } from "../acciones-mfa";
import { FormularioCodigoMfa } from "./FormularioCodigoMfa";

/**
 * Primera activación del segundo factor. El factor se crea al pulsar el botón y
 * no al abrir la página, para no dejar factores a medio crear.
 */
export function ActivarMfa() {
  const [activacion, setActivacion] = useState<ActivacionMfa | null>(null);
  const [preparando, iniciarPreparacion] = useTransition();

  if (!activacion?.ok) {
    return (
      <div className="flex flex-col gap-5">
        {activacion && <Aviso tono="error">{activacion.error}</Aviso>}
        <Boton cargando={preparando} completo onClick={() => iniciarPreparacion(async () => setActivacion(await iniciarActivacionMfa()))}>
          Empezar
        </Boton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <ol className="list-decimal space-y-2 pl-5 text-sm text-texto-sec">
        <li>Abre Google Authenticator (o Authy) y toca «Añadir».</li>
        <li>Escanea este código QR.</li>
        <li>Escribe aquí el código de 6 dígitos que muestra la app.</li>
      </ol>

      <Image
        src={activacion.qr}
        alt="Código QR para activar el segundo factor"
        width={192}
        height={192}
        unoptimized
        className="mx-auto h-48 w-48 rounded-md border border-gris-borde"
      />

      <details className="text-sm">
        <summary className="min-h-[44px] cursor-pointer py-3 text-azul-profundo underline underline-offset-4">
          ¿No puedes escanear? Escribe la clave
        </summary>
        <p className="break-all rounded-md bg-gris-frio p-3 font-mono text-azul-profundo">{activacion.secreto}</p>
        <p className="mt-2 text-texto-sec">
          Guárdala en un lugar seguro: si pierdes el teléfono, con ella puedes volver a configurar la app.
        </p>
      </details>

      <FormularioCodigoMfa
        etiquetaBoton="Activar y entrar"
        alEnviar={(codigo) => confirmarActivacionMfa({ factorId: activacion.factorId, codigo })}
      />
    </div>
  );
}
