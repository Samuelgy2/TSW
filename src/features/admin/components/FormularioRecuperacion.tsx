"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Aviso, Boton, Campo } from "@/components/ui";
import { solicitarRecuperacion } from "../acciones";
import { esquemaRecuperacion, type EntradaRecuperacion } from "../schemas";

/** Pide el correo y envía el enlace de recuperación. */
export function FormularioRecuperacion({ avisoInicial }: { avisoInicial?: string }) {
  const [enviando, iniciarEnvio] = useTransition();
  const [mensaje, setMensaje] = useState<{ tono: "error" | "exito"; texto: string } | null>(
    avisoInicial ? { tono: "error", texto: avisoInicial } : null,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EntradaRecuperacion>({
    resolver: zodResolver(esquemaRecuperacion),
    defaultValues: { correo: "" },
  });

  const enviar = handleSubmit((datos) => {
    setMensaje(null);
    iniciarEnvio(async () => {
      const resultado = await solicitarRecuperacion(datos);
      setMensaje(
        resultado.ok
          ? { tono: "exito", texto: resultado.mensaje ?? "Revisa tu correo." }
          : { tono: "error", texto: resultado.error },
      );
    });
  });

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
      {mensaje && <Aviso tono={mensaje.tono}>{mensaje.texto}</Aviso>}

      <Campo
        etiqueta="Correo del administrador"
        type="email"
        inputMode="email"
        autoComplete="username"
        required
        error={errors.correo?.message}
        {...register("correo")}
      />

      <Boton type="submit" cargando={enviando} completo>
        Enviar enlace
      </Boton>

      <p className="text-center text-sm">
        <Link
          href="/admin/login"
          className="inline-flex min-h-[44px] items-center text-azul-profundo underline underline-offset-4 hover:text-rojo focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
        >
          Volver al acceso
        </Link>
      </p>
    </form>
  );
}
