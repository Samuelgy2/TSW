"use client";

import Image from "next/image";
import { useState } from "react";

import { Archivo, Boton } from "@/components/ui";
import { subirImagenSitio } from "@/features/admin/acciones-sitio";
import { resolverImagenSitio } from "../imagenes";

const MIMES_IMAGEN_SITIO = ["image/jpeg", "image/png", "image/webp"] as const;
const MAXIMO_IMAGEN_SITIO_BYTES = 10 * 1024 * 1024;

/**
 * Sube una foto al bucket `sitio` y deja su ruta en el borrador. NO la guarda
 * en la base todavía: eso pasa cuando el admin pulsa "Guardar" en la sección
 * completa, igual que cualquier otro campo del formulario.
 *
 * El tipo y el tamaño se comprueban ANTES de subir, en el cliente: el
 * primitivo `Archivo` los verifica por la firma de bytes real del archivo, no
 * por su extensión, y no llama a `alSeleccionar` si no pasan. El servidor
 * (`subirImagenSitio`) los vuelve a comprobar, porque el cliente no es de
 * fiar aunque sea el propio panel.
 */
export function CampoImagenSitio({
  etiqueta,
  valor,
  alCambiar,
}: {
  etiqueta: string;
  valor: string | null;
  alCambiar: (ruta: string | null) => void;
}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function alElegir(archivo: File) {
    setCargando(true);
    setError(null);
    const resultado = await subirImagenSitio(archivo);
    setCargando(false);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    alCambiar(resultado.ruta ?? null);
  }

  const url = resolverImagenSitio(valor);

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-semibold text-azul-profundo">{etiqueta}</span>
      {url && (
        <div className="relative h-32 w-full max-w-xs overflow-hidden rounded-md border border-gris-borde bg-gris-frio">
          <Image src={url} alt="" fill sizes="320px" className="object-cover" />
        </div>
      )}
      <Archivo
        etiqueta={cargando ? "Subiendo…" : "Cambiar imagen"}
        mimesPermitidos={MIMES_IMAGEN_SITIO}
        descripcionTipos="JPG, PNG o WebP"
        maximoBytes={MAXIMO_IMAGEN_SITIO_BYTES}
        ayuda="Hasta 10 MB."
        error={error ?? undefined}
        disabled={cargando}
        alSeleccionar={alElegir}
      />
      {valor && (
        <Boton variante="fantasma" tamano="sm" onClick={() => alCambiar(null)} disabled={cargando}>
          Quitar imagen
        </Boton>
      )}
    </div>
  );
}
