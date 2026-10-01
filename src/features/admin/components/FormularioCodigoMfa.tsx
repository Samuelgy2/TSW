"use client";

import { useEffect, useState, useTransition } from "react";

import { Aviso, Boton, Campo } from "@/components/ui";
import type { ResultadoAccion } from "../acciones";

/** 4:05 */
const reloj = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Campo de 6 dígitos para el código de la app de autenticación. Lo usan la
 * verificación al entrar y la activación; cada una pasa su acción. Con éxito la
 * acción redirige y nunca vuelve aquí.
 */
export function FormularioCodigoMfa({
  alEnviar,
  etiquetaBoton,
}: {
  alEnviar: (codigo: string) => Promise<ResultadoAccion>;
  etiquetaBoton: string;
}) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [espera, setEspera] = useState(0);
  const [enviando, iniciarEnvio] = useTransition();

  useEffect(() => {
    if (espera <= 0) return;
    const id = setTimeout(() => setEspera((e) => e - 1), 1000);
    return () => clearTimeout(id);
  }, [espera]);

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        iniciarEnvio(async () => {
          const resultado = await alEnviar(codigo);
          if (!resultado.ok) {
            setError(resultado.error);
            setEspera(resultado.espera ?? 0);
            setCodigo("");
          }
        });
      }}
    >
      {espera > 0 ? (
        <Aviso tono="error" titulo="Acceso bloqueado">
          Demasiados intentos. Vuelve a intentar en <strong role="timer" aria-live="off">{reloj(espera)}</strong>.
        </Aviso>
      ) : (
        error && <Aviso tono="error">{error}</Aviso>
      )}

      <Campo
        etiqueta="Código de 6 dígitos"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        required
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
      />

      <Boton type="submit" cargando={enviando} disabled={espera > 0 || codigo.length !== 6} completo>
        {etiquetaBoton}
      </Boton>
    </form>
  );
}
