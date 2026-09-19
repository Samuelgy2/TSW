"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Aviso, Boton, Campo } from "@/components/ui";
import { restablecerContrasena } from "../acciones";
import { esquemaNuevaContrasena, type EntradaNuevaContrasena } from "../schemas";

/** Nueva contraseña tras el enlace de recuperación. Al guardar, entra al panel. */
export function FormularioNuevaContrasena() {
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
      const resultado = await restablecerContrasena(datos);
      if (!resultado.ok) {
        setErrorGeneral(resultado.error);
        for (const [campo, mensaje] of Object.entries(resultado.campos ?? {})) {
          if (campo === "contrasena" || campo === "confirmacion") setError(campo, { message: mensaje });
        }
        return;
      }
      router.replace("/admin");
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
        ayuda="Al menos 10 caracteres."
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
