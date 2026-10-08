"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Aviso, Boton, Campo, CampoContrasena } from "@/components/ui";
import { iniciarSesion, type ResultadoAccion } from "../acciones";
import { esquemaAcceso, type EntradaAcceso } from "../schemas";

export type FormularioAccesoProps = {
  redirigir?: string;
  /** Textos de la puerta: por defecto, los del panel de administración. */
  titulo?: string;
  textoAyuda?: string;
  /** Destino del enlace de recuperación. */
  enlaceRecuperar?: string;
  /**
   * Acción de inicio de sesión: la del panel por defecto; /cuenta/acceso pasa
   * la suya, que exige perfil_usuario activo en vez de perfil_admin.
   */
  accion?: (entrada: EntradaAcceso) => Promise<ResultadoAccion>;
};

/** 4:05 */
const reloj = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Acceso con correo y contraseña. Un solo formulario para las dos puertas:
 * `/admin/login` (administradores) y `/cuenta/acceso` (usuarios), que cambian
 * título, texto de ayuda, destino y acción. La validación de aquí es comodidad
 * para quien escribe; la que cuenta es la de la Server Action. Sin enlace de
 * registro: no existe.
 */
export function FormularioAcceso({
  redirigir,
  titulo,
  textoAyuda,
  enlaceRecuperar = "/admin/recuperar",
  accion = iniciarSesion,
}: FormularioAccesoProps) {
  const [enviando, iniciarEnvio] = useTransition();
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  // Segundos de bloqueo que dicta el servidor; el contador solo los muestra.
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return;
    const id = setTimeout(() => setEspera((e) => e - 1), 1000);
    return () => clearTimeout(id);
  }, [espera]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EntradaAcceso>({
    resolver: zodResolver(esquemaAcceso),
    defaultValues: { correo: "", contrasena: "", redirigir },
  });

  const enviar = handleSubmit((datos) => {
    setErrorGeneral(null);
    iniciarEnvio(async () => {
      const resultado = await accion(datos);
      // Con éxito la acción redirige y nunca llega aquí.
      if (!resultado.ok) {
        setErrorGeneral(resultado.error);
        setEspera(resultado.espera ?? 0);
        for (const [campo, mensaje] of Object.entries(resultado.campos ?? {})) {
          if (campo === "correo" || campo === "contrasena") setError(campo, { message: mensaje });
        }
      }
    });
  });

  return (
    <>
      {titulo && <h1 className="text-2xl">{titulo}</h1>}
      {textoAyuda && <p className="mt-2 mb-6 text-sm text-texto-sec">{textoAyuda}</p>}

      <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
        {espera > 0 ? (
          <Aviso tono="error" titulo="Acceso bloqueado">
            Demasiados intentos. Vuelve a intentar en{" "}
            <strong role="timer" aria-live="off">{reloj(espera)}</strong>.
          </Aviso>
        ) : (
          errorGeneral && <Aviso tono="error">{errorGeneral}</Aviso>
        )}

        <input type="hidden" {...register("redirigir")} />

        <Campo
          etiqueta="Correo"
          type="email"
          inputMode="email"
          autoComplete="username"
          required
          error={errors.correo?.message}
          {...register("correo")}
        />
        <CampoContrasena
          etiqueta="Contraseña"
          autoComplete="current-password"
          required
          error={errors.contrasena?.message}
          {...register("contrasena")}
        />

        <Boton type="submit" cargando={enviando} disabled={espera > 0} completo>
          Entrar
        </Boton>

        <p className="text-center text-sm">
          <Link
            href={enlaceRecuperar}
            className="inline-flex min-h-[44px] items-center text-azul-profundo underline underline-offset-4 hover:text-acento-oscuro focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
          >
            ¿Olvidaste la contraseña?
          </Link>
        </p>
      </form>
    </>
  );
}
