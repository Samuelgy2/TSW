"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Aviso, Boton, Campo } from "@/components/ui";
import { restablecerContrasena, type ResultadoAccion } from "../acciones";
import { esquemaNuevaContrasena, type EntradaNuevaContrasena } from "../schemas";

export type FormularioNuevaContrasenaProps = {
  /** Acción que fija la contraseña: la del panel por defecto; /cuenta la suya. */
  accion?: (entrada: EntradaNuevaContrasena) => Promise<ResultadoAccion>;
  /** A dónde entrar al guardar: el panel o el área de cuenta. */
  destinoExito?: string;
};

/**
 * Nueva contraseña tras el enlace de recuperación. Compartido por las dos
 * puertas: cada una pasa su acción y su destino de éxito. Al guardar, entra a
 * su área.
 */
export function FormularioNuevaContrasena({
  accion = restablecerContrasena,
  destinoExito = "/admin",
}: FormularioNuevaContrasenaProps) {
  const router = useRouter();
  const [enviando, iniciarEnvio] = useTransition();
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EntradaNuevaContrasena>({
    resolver: zodResolver(esquemaNuevaContrasena),
    defaultValues: { contrasena: "", confirmacion: "" },
  });

  const enviar = handleSubmit((datos) => {
    setErrorGeneral(null);
    iniciarEnvio(async () => {
      const resultado = await accion(datos);
      if (!resultado.ok) {
        setErrorGeneral(resultado.error);
        for (const [campo, mensaje] of Object.entries(resultado.campos ?? {})) {
          if (campo === "contrasena" || campo === "confirmacion") setError(campo, { message: mensaje });
        }
        return;
      }
      router.replace(destinoExito);
    });
  });

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
      {errorGeneral && <Aviso tono="error">{errorGeneral}</Aviso>}

      <Campo
        etiqueta="Nueva contraseña"
        type="password"
        autoComplete="new-password"
        required
        ayuda="Al menos 12 caracteres."
        error={errors.contrasena?.message}
        {...register("contrasena")}
      />
      <Campo
        etiqueta="Repite la contraseña"
        type="password"
        autoComplete="new-password"
        required
        error={errors.confirmacion?.message}
        {...register("confirmacion")}
      />

      <Boton type="submit" cargando={enviando} completo>
        Guardar contraseña
      </Boton>
    </form>
  );
}
