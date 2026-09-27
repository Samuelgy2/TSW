"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Archivo, Aviso, Badge, Boton, LogoClub } from "@/components/ui";
import { confirmarLogoClub, prepararLogoClub, quitarLogoClub } from "@/features/admin/acciones-sitio";
import type { ClubLogo } from "@/features/admin/queries-contenido";
import { subirDirecto } from "@/features/admin/subir-directo";
import { MAXIMO_IMAGEN_SITIO_BYTES, MIMES_IMAGEN_SITIO, resolverImagenSitio } from "../imagenes";

/**
 * Logos de los clubes y programas. A diferencia de las otras pestañas, aquí
 * no hay borrador ni "Guardar sección": cada logo se fija al subirlo, por
 * `establecer_logo_club`, que es el único camino por el que cambia
 * (migración 17), con el actor en la bitácora.
 *
 * Sin SVG a propósito: un SVG subido puede llevar scripts. PNG con fondo
 * transparente es lo que mejor queda sobre el color de cada club.
 */
export function LogosClubes({ clubes }: { clubes: ClubLogo[] }) {
  if (clubes.length === 0) {
    return <Aviso tono="info">Todavía no hay clubes ni programas registrados.</Aviso>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {clubes.map((club) => (
        <li key={club.id}>
          <FilaLogo club={club} />
        </li>
      ))}
    </ul>
  );
}

function FilaLogo({ club }: { club: ClubLogo }) {
  const router = useRouter();
  const [ruta, setRuta] = useState(club.logo_path);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<{ tono: "exito" | "error"; texto: string } | null>(null);

  async function subir(archivo: File | null) {
    // `Archivo` avisa con null cuando el elegido no pasó su validación.
    if (!archivo) return;
    setOcupado(true);
    setMensaje(null);
    const resultado = await subirDirecto(
      archivo,
      { mimesPermitidos: MIMES_IMAGEN_SITIO, maximoBytes: MAXIMO_IMAGEN_SITIO_BYTES },
      (mime, tamano) => prepararLogoClub(club.id, mime, tamano),
      (rutaSubida) => confirmarLogoClub(club.id, rutaSubida),
    );
    setOcupado(false);
    if (resultado.ok) {
      setRuta(resultado.ruta ?? ruta);
      setMensaje({ tono: "exito", texto: resultado.mensaje ?? "Logo cargado." });
      router.refresh();
    } else {
      setMensaje({ tono: "error", texto: resultado.error });
    }
  }

  async function quitar() {
    setOcupado(true);
    setMensaje(null);
    const resultado = await quitarLogoClub(club.id);
    setOcupado(false);
    if (resultado.ok) {
      setRuta(null);
      setMensaje({ tono: "exito", texto: resultado.mensaje ?? "Logo quitado." });
      router.refresh();
    } else {
      setMensaje({ tono: "error", texto: resultado.error });
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border border-gris-borde p-4 sm:flex-row sm:items-start">
      <LogoClub nombre={club.nombre} logoUrl={resolverImagenSitio(ruta)} color={club.color_identidad} tamano="lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-azul-profundo">{club.nombre}</span>
          {!club.activo && <Badge>Desactivado</Badge>}
        </div>
        {mensaje && <Aviso tono={mensaje.tono}>{mensaje.texto}</Aviso>}
        <Archivo
          etiqueta={ocupado ? "Subiendo…" : ruta ? "Cambiar logo" : "Subir logo"}
          mimesPermitidos={MIMES_IMAGEN_SITIO}
          descripcionTipos="PNG, JPG o WebP"
          maximoBytes={MAXIMO_IMAGEN_SITIO_BYTES}
          ayuda="Mejor PNG con fondo transparente. Sin SVG."
          disabled={ocupado}
          alSeleccionar={(archivo) => void subir(archivo as File | null)}
        />
        {ruta && (
          <Boton variante="fantasma" tamano="sm" onClick={quitar} disabled={ocupado} className="self-start">
            Quitar logo
          </Boton>
        )}
      </div>
    </div>
  );
}
