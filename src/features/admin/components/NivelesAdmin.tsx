"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Archivo, Aviso, AreaTexto, Boton, Campo, ChipEstado, Modal, Select } from "@/components/ui";
import type { Club } from "@/features/clubes/types";
import { MAXIMO_IMAGEN_SITIO_BYTES, MIMES_IMAGEN_SITIO, resolverImagenSitio } from "@/features/sitio/imagenes";
import {
  alternarNivel,
  confirmarImagenNivel,
  guardarNivel,
  prepararImagenNivel,
  quitarImagenNivel,
  reordenarNiveles,
} from "../acciones-contenido";
import { subirDirecto } from "../subir-directo";
import type { Nivel } from "../types";

type ResultadoAccion = { ok: boolean; error?: string; mensaje?: string; id?: string };
const OPCIONES_IMAGEN = { mimesPermitidos: MIMES_IMAGEN_SITIO, maximoBytes: MAXIMO_IMAGEN_SITIO_BYTES };

/**
 * Módulo de niveles.
 *
 * Desde la migración 17 un nivel pertenece a un club y el UNIQUE es
 * (club_id, orden): Minirider e Intermedio existen en los dos clubes, con la
 * misma descripción y horarios distintos. Por eso la pantalla se agrupa por
 * club y el reordenamiento ocurre DENTRO de cada grupo: `reordenar_niveles`
 * recibe el club y rechaza listas que mezclen, con mensaje propio.
 */
export function NivelesAdmin({ niveles, clubes }: { niveles: Nivel[]; clubes: Club[] }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<ResultadoAccion | null>(null);
  const [editando, setEditando] = useState<Nivel | "nuevo" | null>(null);

  /**
   * Los niveles ya llegan ordenados por `orden`; aquí solo se reparten por
   * club conservando ese orden. Un nivel cuyo club se desactivó queda en el
   * grupo "Sin club visible" en vez de desaparecer de la pantalla: el
   * administrador tiene que poder verlo para moverlo.
   */
  const grupos = useMemo(() => {
    const porClub = new Map<string, Nivel[]>();
    for (const nivel of niveles) {
      const lista = porClub.get(nivel.club_id) ?? [];
      lista.push(nivel);
      porClub.set(nivel.club_id, lista);
    }

    const conocidos = clubes.map((club) => ({ club, niveles: porClub.get(club.id) ?? [] }));
    const huerfanos = [...porClub.entries()]
      .filter(([id]) => !clubes.some((c) => c.id === id))
      .map(([id, lista]) => ({ club: { id, nombre: "Club no visible" } as Club, niveles: lista }));

    return [...conocidos, ...huerfanos];
  }, [niveles, clubes]);

  function ejecutar(accion: () => Promise<ResultadoAccion>) {
    setAviso(null);
    iniciar(async () => {
      const resultado = await accion();
      setAviso(resultado);
      if (resultado.ok) router.refresh();
    });
  }

  /** Mueve un nivel dentro de su club y manda el orden completo de ESE club. */
  function mover(clubId: string, lista: Nivel[], indice: number, direccion: -1 | 1) {
    const ids = lista.map((n) => n.id);
    const destino = indice + direccion;
    if (destino < 0 || destino >= ids.length) return;
    [ids[indice], ids[destino]] = [ids[destino]!, ids[indice]!];
    ejecutar(() => reordenarNiveles(clubId, ids));
  }

  return (
    <div className="flex flex-col gap-8">
      {aviso?.error && <Aviso tono="error">{aviso.error}</Aviso>}
      {aviso?.ok && aviso.mensaje && <Aviso tono="exito">{aviso.mensaje}</Aviso>}

      <div className="flex justify-end">
        <Boton onClick={() => setEditando("nuevo")} disabled={clubes.length === 0}>
          Nuevo nivel
        </Boton>
      </div>

      {clubes.length === 0 && (
        <Aviso tono="aviso">
          No hay clubes activos. Un nivel pertenece a un club, así que primero hay que dar de alta
          al menos uno.
        </Aviso>
      )}

      {grupos.map(({ club, niveles: lista }) => (
        <section key={club.id} aria-labelledby={`club-${club.id}`} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gris-borde pb-2">
            <h2 id={`club-${club.id}`} className="text-lg uppercase">
              {club.nombre}
            </h2>
            <span className="text-sm text-texto-sec">
              {lista.length === 1 ? "1 nivel" : `${lista.length} niveles`}
            </span>
          </div>

          {lista.length === 0 ? (
            <p className="rounded-lg border-2 border-dashed border-gris-borde bg-blanco px-6 py-8 text-center text-texto-sec">
              Este club todavía no tiene niveles.
            </p>
          ) : (
            <ol className="flex flex-col gap-3">
              {lista.map((n, indice) => (
                <li key={n.id} className="rounded-lg border border-gris-borde bg-blanco p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-lg text-acento-oscuro" aria-hidden="true">
                          {indice + 1}
                        </span>
                        <ChipEstado tipo="activo" valor={n.activo} />
                      </div>
                      <h3 className="mt-1 text-lg">{n.nombre}</h3>
                      <p className="text-sm text-texto-sec">
                        {[
                          n.rango_edad,
                          n.horario,
                          n.cupo_maximo ? `Máximo ${n.cupo_maximo} deportistas` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Sin edades, horario ni cupo definidos"}
                      </p>
                      {n.criterio_promocion && (
                        <p className="mt-1 text-sm text-texto-sec">
                          <span className="font-semibold">Promoción:</span> {n.criterio_promocion}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Solo un glifo: sin el ancho mínimo, el área táctil se queda en 39 px. */}
                      <Boton
                        tamano="sm"
                        variante="fantasma"
                        className="min-w-[44px]"
                        disabled={pendiente || indice === 0}
                        onClick={() => mover(club.id, lista, indice, -1)}
                      >
                        ↑ <span className="sr-only">Subir {n.nombre}</span>
                      </Boton>
                      <Boton
                        tamano="sm"
                        variante="fantasma"
                        className="min-w-[44px]"
                        disabled={pendiente || indice === lista.length - 1}
                        onClick={() => mover(club.id, lista, indice, 1)}
                      >
                        ↓ <span className="sr-only">Bajar {n.nombre}</span>
                      </Boton>
                      <Boton tamano="sm" variante="secundario" onClick={() => setEditando(n)}>
                        Editar
                      </Boton>
                      <Boton
                        tamano="sm"
                        variante="fantasma"
                        disabled={pendiente}
                        onClick={() => ejecutar(() => alternarNivel(n.id, !n.activo))}
                      >
                        {n.activo ? "Desactivar" : "Activar"}
                      </Boton>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}

      <ModalNivel
        key={editando === "nuevo" ? "nuevo" : (editando?.id ?? "cerrado")}
        nivel={editando}
        clubes={clubes}
        alCerrar={() => setEditando(null)}
        alGuardar={guardarNivel}
        onGuardado={(resultado) => {
          setAviso(resultado);
          if (resultado.ok) router.refresh();
        }}
      />
    </div>
  );
}

function ModalNivel({
  nivel,
  clubes,
  alCerrar,
  alGuardar,
  onGuardado,
}: {
  nivel: Nivel | "nuevo" | null;
  clubes: Club[];
  alCerrar: () => void;
  alGuardar: (entrada: {
    id?: string;
    clubId: string;
    nombre: string;
    orden: number;
    cupoMaximo?: number | null;
    rangoEdad?: string;
    horario?: string;
    descripcion?: string;
    criterioPromocion?: string;
    activo: boolean;
  }) => Promise<ResultadoAccion>;
  onGuardado: (resultado: ResultadoAccion) => void;
}) {
  const esNuevo = nivel === "nuevo";
  const existente = nivel && nivel !== "nuevo" ? nivel : null;

  const [clubId, setClubId] = useState(existente?.club_id ?? clubes[0]?.id ?? "");
  const [nombre, setNombre] = useState(existente?.nombre ?? "");
  const [rangoEdad, setRangoEdad] = useState(existente?.rango_edad ?? "");
  const [cupo, setCupo] = useState(existente?.cupo_maximo ? String(existente.cupo_maximo) : "");
  const [horario, setHorario] = useState(existente?.horario ?? "");
  const [descripcion, setDescripcion] = useState(existente?.descripcion ?? "");
  const [criterio, setCriterio] = useState(existente?.criterio_promocion ?? "");
  const [activo, setActivo] = useState(existente?.activo ?? true);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Imagen. En un nivel que ya existe se sube y se quita al instante, sin
  // esperar a "Guardar" (como la foto de un deporte). En uno nuevo no hay id
  // todavía: el archivo espera aquí y sube justo después de crear el nivel.
  const [rutaImagen, setRutaImagen] = useState<string | null>(existente?.imagen_path ?? null);
  const [pendiente, setPendiente] = useState<File | null>(null);
  const [vistaPendiente, setVistaPendiente] = useState<string | null>(null);
  const [trabajandoImagen, setTrabajandoImagen] = useState(false);
  const [errorImagen, setErrorImagen] = useState<string | null>(null);

  useEffect(() => {
    if (!pendiente) return setVistaPendiente(null);
    const url = URL.createObjectURL(pendiente);
    setVistaPendiente(url);
    return () => URL.revokeObjectURL(url);
  }, [pendiente]);

  const urlImagen = vistaPendiente ?? resolverImagenSitio(rutaImagen);

  async function elegirImagen(archivo: File | null) {
    // `Archivo` avisa con null cuando el elegido no pasó su validación.
    if (!archivo) return;
    setErrorImagen(null);
    if (!existente) return setPendiente(archivo);

    setTrabajandoImagen(true);
    const resultado = await subirDirecto(
      archivo,
      OPCIONES_IMAGEN,
      (mime, tamano) => prepararImagenNivel(existente.id, mime, tamano),
      (ruta) => confirmarImagenNivel(existente.id, ruta),
    );
    setTrabajandoImagen(false);
    if (!resultado.ok) return setErrorImagen(resultado.error);
    setRutaImagen(resultado.ruta ?? rutaImagen);
    onGuardado({ ok: true, mensaje: resultado.mensaje });
  }

  async function quitarImagen() {
    setErrorImagen(null);
    if (!existente || !rutaImagen) return setPendiente(null);
    setTrabajandoImagen(true);
    const resultado = await quitarImagenNivel(existente.id);
    setTrabajandoImagen(false);
    if (!resultado.ok) return setErrorImagen(resultado.error);
    setRutaImagen(null);
    onGuardado({ ok: true, mensaje: resultado.mensaje });
  }

  async function guardar() {
    setError(null);
    if (!clubId) return setError("Elige el club al que pertenece el nivel.");
    if (nombre.trim().length < 3) return setError("El nombre es obligatorio.");
    // El cupo es opcional, pero si se escribe algo tiene que ser un entero
    // positivo: un "14 deportistas" tecleado a mano llegaría como NaN.
    const cupoLimpio = cupo.trim();
    if (cupoLimpio && !/^\d+$/.test(cupoLimpio)) return setError("El cupo es un número entero de deportistas.");
    if (cupoLimpio && Number(cupoLimpio) < 1) return setError("El cupo debe ser mayor que cero.");

    setCargando(true);
    const resultado = await alGuardar({
      id: existente?.id,
      clubId,
      nombre: nombre.trim(),
      // El orden lo asigna reordenar: uno más del máximo actual de su club.
      orden: existente?.orden ?? 0,
      cupoMaximo: cupoLimpio ? Number(cupoLimpio) : null,
      rangoEdad: rangoEdad.trim() || undefined,
      horario: horario.trim() || undefined,
      descripcion: descripcion.trim() || undefined,
      criterioPromocion: criterio.trim() || undefined,
      activo,
    });
    // Nivel nuevo con imagen en espera: ya hay id, ahora sí sube.
    if (resultado.ok && !existente && pendiente && resultado.id) {
      const id = resultado.id;
      const subida = await subirDirecto(
        pendiente,
        OPCIONES_IMAGEN,
        (mime, tamano) => prepararImagenNivel(id, mime, tamano),
        (ruta) => confirmarImagenNivel(id, ruta),
      );
      if (!subida.ok) {
        setCargando(false);
        onGuardado({ ok: true, mensaje: `Nivel creado, pero la imagen no se subió: ${subida.error} Edita el nivel para reintentar.` });
        return alCerrar();
      }
    }
    setCargando(false);
    onGuardado(resultado);
    if (resultado.ok) alCerrar();
    else setError(resultado.error ?? "No se pudo guardar.");
  }

  return (
    <Modal
      abierto={nivel !== null}
      alCerrar={alCerrar}
      titulo={esNuevo ? "Nuevo nivel" : `Editar — ${existente?.nombre ?? ""}`}
      className="sm:max-w-xl"
    >
      <div className="flex flex-col gap-4">
        {error && <Aviso tono="error">{error}</Aviso>}
        <Select
          etiqueta="Club"
          value={clubId}
          onChange={(e) => setClubId(e.target.value)}
          required
          ayuda="Minirider e Intermedio existen en los dos clubes: son niveles distintos, con su propio horario."
          opciones={clubes.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
        />
        <Campo etiqueta="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={120} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Rango de edad"
            value={rangoEdad}
            onChange={(e) => setRangoEdad(e.target.value)}
            maxLength={80}
            placeholder="De 2 años y medio a 5 años"
          />
          <Campo
            etiqueta="Cupo máximo"
            type="text"
            inputMode="numeric"
            value={cupo}
            onChange={(e) => setCupo(e.target.value)}
            maxLength={4}
            placeholder="14"
            ayuda="Deportistas por grupo. Déjalo vacío si el nivel no fija cupo."
          />
        </div>
        <Campo
          etiqueta="Horario"
          value={horario}
          onChange={(e) => setHorario(e.target.value)}
          maxLength={200}
          placeholder="Miércoles y viernes, 4:00 a 6:00 p. m."
        />
        <AreaTexto etiqueta="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={1000} />
        <AreaTexto
          etiqueta="Criterio de promoción"
          value={criterio}
          onChange={(e) => setCriterio(e.target.value)}
          maxLength={500}
          ayuda="Qué debe lograr el deportista para pasar al siguiente nivel."
        />
        <div className="flex flex-col gap-3">
          <span className="text-sm font-semibold text-azul-profundo">Imagen del nivel</span>
          {urlImagen && (
            <div className="relative aspect-4/3 w-full max-w-xs overflow-hidden rounded-md border border-gris-borde bg-gris-frio">
              <Image src={urlImagen} alt="" fill unoptimized={vistaPendiente !== null} sizes="320px" className="object-cover" />
            </div>
          )}
          <Archivo
            etiqueta={trabajandoImagen ? "Subiendo…" : urlImagen ? "Reemplazar imagen" : "Elegir imagen"}
            mimesPermitidos={MIMES_IMAGEN_SITIO}
            descripcionTipos="JPG, PNG o WebP"
            maximoBytes={MAXIMO_IMAGEN_SITIO_BYTES}
            ayuda={esNuevo ? "Hasta 10 MB. Se sube al crear el nivel." : "Hasta 10 MB. Se aplica al instante."}
            error={errorImagen ?? undefined}
            disabled={trabajandoImagen || cargando}
            alSeleccionar={elegirImagen}
          />
          {(rutaImagen || pendiente) && (
            <Boton variante="fantasma" tamano="sm" onClick={quitarImagen} disabled={trabajandoImagen || cargando}>
              Quitar imagen
            </Boton>
          )}
        </div>
        <label className="flex min-h-[44px] items-center gap-3 text-sm">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-5 w-5 accent-acento-oscuro" />
          Nivel activo (visible en el sitio público)
        </label>
      </div>
      <div className="mt-2 flex flex-col gap-3 border-t border-gris-borde p-5 sm:flex-row sm:justify-end">
        <Boton variante="fantasma" onClick={alCerrar} disabled={cargando}>
          Cancelar
        </Boton>
        <Boton onClick={guardar} cargando={cargando}>
          {esNuevo ? "Crear nivel" : "Guardar cambios"}
        </Boton>
      </div>
    </Modal>
  );
}
