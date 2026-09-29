"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Archivo, AreaTexto, Aviso, Boton, Campo, ChipEstado, Modal, PieModal } from "@/components/ui";
import {
  alternarSlideCarrusel,
  confirmarImagenSlideCarrusel,
  eliminarSlideCarrusel,
  guardarSlideCarrusel,
  prepararImagenSlideCarrusel,
  reordenarSlidesCarrusel,
} from "@/features/admin/acciones-sitio";
import { esquemaSlideCarrusel, type EntradaSlideCarrusel } from "@/features/admin/schemas";
import { subirDirecto } from "@/features/admin/subir-directo";
import type { SlideCarrusel } from "@/features/carrusel/types";
import { MAXIMO_IMAGEN_SITIO_BYTES, MIMES_IMAGEN_SITIO, resolverImagenSitio } from "../imagenes";

type ResultadoAccion = { ok: boolean; error?: string; mensaje?: string };

/**
 * Pestaña "Carrusel": diapositivas de la portada (migración 21).
 *
 * Texto, activo y orden se guardan con `guardar_slide_carrusel` (reemplazo
 * total); la imagen entra aparte, por `establecer_imagen_slide_carrusel`,
 * mismo principio que el logo de club: si entrara por los dos caminos, cada
 * uno necesitaría su copia de las reglas.
 *
 * El reordenamiento reusa el patrón de NivelesAdmin: flechas ↑↓, sin
 * arrastrar-y-soltar. La diapositiva nueva se crea sin imagen; la tarjeta ya
 * en la lista es donde se sube.
 */
export function CarruselAdmin({ slides }: { slides: SlideCarrusel[] }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<ResultadoAccion | null>(null);
  const [editando, setEditando] = useState<SlideCarrusel | "nuevo" | null>(null);
  const [borrando, setBorrando] = useState<SlideCarrusel | null>(null);

  function ejecutar(accion: () => Promise<ResultadoAccion>) {
    setAviso(null);
    iniciar(async () => {
      const resultado = await accion();
      setAviso(resultado);
      if (resultado.ok) router.refresh();
    });
  }

  function mover(indice: number, direccion: -1 | 1) {
    const ids = slides.map((s) => s.id);
    const destino = indice + direccion;
    if (destino < 0 || destino >= ids.length) return;
    [ids[indice], ids[destino]] = [ids[destino]!, ids[indice]!];
    ejecutar(() => reordenarSlidesCarrusel(ids));
  }

  return (
    <div className="flex flex-col gap-6">
      {aviso?.error && <Aviso tono="error">{aviso.error}</Aviso>}
      {aviso?.ok && aviso.mensaje && <Aviso tono="exito">{aviso.mensaje}</Aviso>}

      <div className="flex justify-end">
        <Boton onClick={() => setEditando("nuevo")}>Nueva diapositiva</Boton>
      </div>

      {slides.length === 0 ? (
        <p className="rounded-lg border-2 border-dashed border-gris-borde bg-blanco px-6 py-8 text-center text-texto-sec">
          Todavía no hay diapositivas. El carrusel no se muestra en la portada mientras esta lista esté vacía.
        </p>
      ) : (
        <ol className="flex flex-col gap-4">
          {slides.map((slide, indice) => (
            <li key={slide.id}>
              <FichaSlide
                slide={slide}
                indice={indice}
                total={slides.length}
                pendiente={pendiente}
                onMover={(direccion) => mover(indice, direccion)}
                onEditar={() => setEditando(slide)}
                onAlternar={() => ejecutar(() => alternarSlideCarrusel(slide.id, !slide.activo))}
                onEliminar={() => setBorrando(slide)}
              />
            </li>
          ))}
        </ol>
      )}

      <ModalSlide
        slide={editando}
        alCerrar={() => setEditando(null)}
        onGuardado={(resultado) => {
          setAviso(resultado);
          if (resultado.ok) router.refresh();
        }}
      />

      <Modal
        abierto={borrando !== null}
        alCerrar={() => setBorrando(null)}
        titulo="¿Eliminar esta diapositiva?"
        pie={
          <PieModal
            alCerrar={() => setBorrando(null)}
            cargando={pendiente}
            etiquetaGuardar="Eliminar"
            onGuardar={() => {
              const id = borrando?.id;
              setBorrando(null);
              if (id) ejecutar(() => eliminarSlideCarrusel(id));
            }}
          />
        }
      >
        <p>
          Se borra «{borrando?.titulo}» de forma permanente. La imagen no se borra del bucket, pero deja de
          referenciarse. Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  );
}

function FichaSlide({
  slide,
  indice,
  total,
  pendiente,
  onMover,
  onEditar,
  onAlternar,
  onEliminar,
}: {
  slide: SlideCarrusel;
  indice: number;
  total: number;
  pendiente: boolean;
  onMover: (direccion: -1 | 1) => void;
  onEditar: () => void;
  onAlternar: () => void;
  onEliminar: () => void;
}) {
  const router = useRouter();
  const [ruta, setRuta] = useState(slide.imagen_path);
  const [subiendo, setSubiendo] = useState(false);
  const [mensajeImagen, setMensajeImagen] = useState<{ tono: "exito" | "error"; texto: string } | null>(null);

  async function subirImagen(archivo: File | null) {
    if (!archivo) return;
    setSubiendo(true);
    setMensajeImagen(null);
    const resultado = await subirDirecto(
      archivo,
      { mimesPermitidos: MIMES_IMAGEN_SITIO, maximoBytes: MAXIMO_IMAGEN_SITIO_BYTES },
      (mime, tamano) => prepararImagenSlideCarrusel(slide.id, mime, tamano),
      (rutaSubida) => confirmarImagenSlideCarrusel(slide.id, rutaSubida),
    );
    setSubiendo(false);
    if (resultado.ok) {
      setRuta(resultado.ruta ?? ruta);
      setMensajeImagen({ tono: "exito", texto: resultado.mensaje ?? "Imagen cargada." });
      router.refresh();
    } else {
      setMensajeImagen({ tono: "error", texto: resultado.error });
    }
  }

  const url = resolverImagenSitio(ruta);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gris-borde bg-blanco p-4 sm:flex-row sm:items-start">
      <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-md bg-gris-frio sm:w-48">
        {url ? (
          <Image src={url} alt="" fill sizes="192px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-texto-sec">Sin imagen</div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-lg text-acento-oscuro" aria-hidden="true">
            {indice + 1}
          </span>
          <ChipEstado tipo="activo" valor={slide.activo} />
        </div>
        <h3 className="mt-1 text-lg">{slide.titulo}</h3>
        {slide.descripcion && <p className="text-sm text-texto-sec">{slide.descripcion}</p>}
        {slide.etiqueta_enlace && (
          <p className="mt-1 text-sm text-texto-sec">
            Botón: <span className="font-semibold">{slide.etiqueta_enlace}</span> → {slide.destino_enlace}
          </p>
        )}

        {mensajeImagen && (
          <div className="mt-2">
            <Aviso tono={mensajeImagen.tono}>{mensajeImagen.texto}</Aviso>
          </div>
        )}
        <div className="mt-2">
          <Archivo
            etiqueta={subiendo ? "Subiendo…" : ruta ? "Cambiar imagen" : "Subir imagen"}
            mimesPermitidos={MIMES_IMAGEN_SITIO}
            descripcionTipos="PNG, JPG o WebP"
            maximoBytes={MAXIMO_IMAGEN_SITIO_BYTES}
            disabled={subiendo}
            alSeleccionar={(archivo) => void subirImagen(archivo as File | null)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
        <div className="flex gap-2 sm:justify-end">
          <Boton
            tamano="sm"
            variante="fantasma"
            className="min-w-[44px]"
            disabled={pendiente || indice === 0}
            onClick={() => onMover(-1)}
          >
            ↑ <span className="sr-only">Subir {slide.titulo}</span>
          </Boton>
          <Boton
            tamano="sm"
            variante="fantasma"
            className="min-w-[44px]"
            disabled={pendiente || indice === total - 1}
            onClick={() => onMover(1)}
          >
            ↓ <span className="sr-only">Bajar {slide.titulo}</span>
          </Boton>
        </div>
        <Boton tamano="sm" variante="secundario" onClick={onEditar}>
          Editar
        </Boton>
        <Boton tamano="sm" variante="fantasma" disabled={pendiente} onClick={onAlternar}>
          {slide.activo ? "Desactivar" : "Activar"}
        </Boton>
        <Boton tamano="sm" variante="fantasma" disabled={pendiente} onClick={onEliminar}>
          Eliminar
        </Boton>
      </div>
    </div>
  );
}

function ModalSlide({
  slide,
  alCerrar,
  onGuardado,
}: {
  slide: SlideCarrusel | "nuevo" | null;
  alCerrar: () => void;
  onGuardado: (resultado: ResultadoAccion) => void;
}) {
  const esNuevo = slide === "nuevo";
  const existente = slide && slide !== "nuevo" ? slide : null;

  const [titulo, setTitulo] = useState(existente?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(existente?.descripcion ?? "");
  const [etiquetaEnlace, setEtiquetaEnlace] = useState(existente?.etiqueta_enlace ?? "");
  const [destinoEnlace, setDestinoEnlace] = useState(existente?.destino_enlace ?? "");
  const [activo, setActivo] = useState(existente?.activo ?? true);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function guardar() {
    setError(null);
    const entrada: EntradaSlideCarrusel = {
      id: existente?.id,
      orden: existente?.orden ?? 0,
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || undefined,
      etiquetaEnlace: etiquetaEnlace.trim() || undefined,
      destinoEnlace: destinoEnlace.trim() || undefined,
      activo,
    };
    const validado = esquemaSlideCarrusel.safeParse(entrada);
    if (!validado.success) {
      setError(validado.error.issues[0]?.message ?? "Revisa los datos.");
      return;
    }

    setCargando(true);
    const resultado = await guardarSlideCarrusel(validado.data);
    setCargando(false);
    onGuardado(resultado);
    if (resultado.ok) alCerrar();
    else setError(resultado.error ?? "No se pudo guardar.");
  }

  return (
    <Modal
      abierto={slide !== null}
      alCerrar={alCerrar}
      titulo={esNuevo ? "Nueva diapositiva" : `Editar — ${existente?.titulo ?? ""}`}
      className="sm:max-w-xl"
    >
      <div className="flex flex-col gap-4">
        {error && <Aviso tono="error">{error}</Aviso>}
        <Campo etiqueta="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} required />
        <AreaTexto
          etiqueta="Descripción"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          maxLength={300}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Texto del botón"
            value={etiquetaEnlace}
            onChange={(e) => setEtiquetaEnlace(e.target.value)}
            maxLength={40}
            placeholder="Ver semilleros"
            ayuda="Vacío = la diapositiva no lleva botón."
          />
          <Campo
            etiqueta="Destino del botón"
            value={destinoEnlace}
            onChange={(e) => setDestinoEnlace(e.target.value)}
            placeholder="/semilleros"
            ayuda="Ruta interna o ancla (#seccion). Los dos campos van juntos."
          />
        </div>
        <label className="flex min-h-[44px] items-center gap-3 text-sm">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-5 w-5 accent-acento-oscuro" />
          Diapositiva activa (visible en la portada)
        </label>
      </div>
      <div className="mt-2 flex flex-col gap-3 border-t border-gris-borde p-5 sm:flex-row sm:justify-end">
        <Boton variante="fantasma" onClick={alCerrar} disabled={cargando}>
          Cancelar
        </Boton>
        <Boton onClick={guardar} cargando={cargando}>
          {esNuevo ? "Crear diapositiva" : "Guardar cambios"}
        </Boton>
      </div>
    </Modal>
  );
}
