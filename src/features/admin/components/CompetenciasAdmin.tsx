"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Aviso, Archivo, AreaTexto, Badge, Boton, Campo, ChipEstado, Modal } from "@/components/ui";
import { formatearFecha } from "@/lib/utils";
import {
  archivarCompetencia,
  destacarCompetencia,
  guardarCompetencia,
  publicarCompetencia,
  subirImagenCompetencia,
} from "../acciones-contenido";
import { MAXIMO_IMAGEN_BYTES, MIMES_IMAGEN } from "../constantes";
import type { CompetenciaConResultados } from "../types";

type ResultadoAccion = { ok: boolean; error?: string; mensaje?: string };

/**
 * Módulo de competencias. Reglas que la interfaz hace cumplir:
 *  · Se guarda como borrador; publicar es una acción aparte y explícita.
 *  · Sin casilla de autorización de imagen no hay subida de fotos: hay
 *    menores de edad en ellas y el control es documental.
 *  · Destacar quita el destaque de la anterior: se advierte antes.
 *  · El cuerpo es texto plano: nunca se interpreta como HTML.
 */
export function CompetenciasAdmin({ competencias }: { competencias: CompetenciaConResultados[] }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<ResultadoAccion | null>(null);
  const [editando, setEditando] = useState<CompetenciaConResultados | "nuevo" | null>(null);
  const [confirmarDestacar, setConfirmarDestacar] = useState<CompetenciaConResultados | null>(null);
  const [confirmarArchivar, setConfirmarArchivar] = useState<CompetenciaConResultados | null>(null);

  const destacada = competencias.find((c) => c.destacado) ?? null;

  function ejecutar(accion: () => Promise<ResultadoAccion>) {
    setAviso(null);
    iniciar(async () => {
      const resultado = await accion();
      setAviso(resultado);
      if (resultado.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {aviso?.error && <Aviso tono="error">{aviso.error}</Aviso>}
      {aviso?.ok && aviso.mensaje && <Aviso tono="exito">{aviso.mensaje}</Aviso>}

      <div className="flex justify-end">
        <Boton onClick={() => setEditando("nuevo")}>Nueva competencia</Boton>
      </div>

      {competencias.length === 0 && (
        <p className="rounded-lg border-2 border-dashed border-gris-borde bg-blanco px-6 py-10 text-center text-texto-sec">
          Todavía no hay competencias. Crea la primera como borrador.
        </p>
      )}

      <ul className="flex flex-col gap-4">
        {competencias.map((c) => (
          <li key={c.id} className="rounded-lg border border-gris-borde bg-blanco p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <ChipEstado tipo="publicacion" valor={c.estado} />
                  {c.destacado && <Badge tono="acento">Destacada</Badge>}
                  {c.imagen_path && <Badge tono="neutro">Con foto</Badge>}
                </div>
                <h3 className="mt-2 text-lg">{c.titulo}</h3>
                <p className="text-sm text-texto-sec">
                  {formatearFecha(c.fecha)} · {c.resultados.length} resultado{c.resultados.length === 1 ? "" : "s"} · /{c.slug}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Boton tamano="sm" variante="secundario" onClick={() => setEditando(c)}>
                  Editar
                </Boton>
                {c.estado === "borrador" && (
                  <Boton
                    tamano="sm"
                    disabled={pendiente}
                    onClick={() =>
                      ejecutar(() => publicarCompetencia(c.id, c.autorizacion_imagen_en !== null, c.imagen_path))
                    }
                  >
                    Publicar
                  </Boton>
                )}
                {c.estado === "publicado" && (
                  <Boton tamano="sm" variante="fantasma" disabled={pendiente} onClick={() => setConfirmarArchivar(c)}>
                    Archivar
                  </Boton>
                )}
                {!c.destacado && c.estado === "publicado" && (
                  <Boton tamano="sm" variante="fantasma" disabled={pendiente} onClick={() => setConfirmarDestacar(c)}>
                    Destacar
                  </Boton>
                )}
              </div>
            </div>

            {c.resultados.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2 text-sm">
                {c.resultados.map((r) => (
                  <li key={r.id} className="rounded-md bg-gris-frio px-3 py-1.5">
                    <span className="font-semibold text-rojo">{r.puesto}.º</span> {r.rider} ·{" "}
                    <span className="text-texto-sec">{r.categoria}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      <ModalCompetencia
        competencia={editando}
        alCerrar={() => setEditando(null)}
        alGuardar={guardarCompetencia}
        onGuardado={(resultado) => {
          setAviso(resultado);
          if (resultado.ok) router.refresh();
        }}
      />

      {/* Destacar quita el destaque anterior: se advierte antes de hacerlo. */}
      <Modal
        abierto={confirmarDestacar !== null}
        alCerrar={() => setConfirmarDestacar(null)}
        titulo="¿Destacar esta competencia?"
        pie={
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Boton variante="fantasma" onClick={() => setConfirmarDestacar(null)}>
              Cancelar
            </Boton>
            <Boton
              cargando={pendiente}
              onClick={() => {
                const c = confirmarDestacar;
                setConfirmarDestacar(null);
                if (c) ejecutar(() => destacarCompetencia(c.id, true));
              }}
            >
              Destacar
            </Boton>
          </div>
        }
      >
        <p className="text-texto-sec">
          Ocupará el espacio principal de la portada y{" "}
          <strong className="text-azul-profundo">
            {destacada ? `“${destacada.titulo}” dejará de estar destacada` : "no hay ninguna destacada ahora"}
          </strong>
          . Solo puede haber una.
        </p>
      </Modal>

      <Modal
        abierto={confirmarArchivar !== null}
        alCerrar={() => setConfirmarArchivar(null)}
        titulo="¿Archivar esta competencia?"
        pie={
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Boton variante="fantasma" onClick={() => setConfirmarArchivar(null)}>
              Cancelar
            </Boton>
            <Boton
              cargando={pendiente}
              onClick={() => {
                const c = confirmarArchivar;
                setConfirmarArchivar(null);
                if (c) ejecutar(() => archivarCompetencia(c.id));
              }}
            >
              Archivar
            </Boton>
          </div>
        }
      >
        <p className="text-texto-sec">
          Deja de verse en el sitio público, conservando su historial y sus resultados. Puedes publicarla de nuevo
          desde el borrador que queda aquí.
        </p>
      </Modal>
    </div>
  );
}

// --- Editor -----------------------------------------------------------------

function ModalCompetencia({
  competencia,
  alCerrar,
  alGuardar,
  onGuardado,
}: {
  competencia: CompetenciaConResultados | "nuevo" | null;
  alCerrar: () => void;
  alGuardar: (entrada: {
    id?: string;
    titulo: string;
    slug: string;
    fecha: string;
    cuerpo?: string;
    autorizacionImagen: boolean;
  }) => Promise<ResultadoAccion>;
  onGuardado: (resultado: ResultadoAccion) => void;
}) {
  const esNuevo = competencia === "nuevo";
  const existente = competencia && competencia !== "nuevo" ? competencia : null;

  const [titulo, setTitulo] = useState(existente?.titulo ?? "");
  const [slug, setSlug] = useState(existente?.slug ?? "");
  const [slugEditado, setSlugEditado] = useState(Boolean(existente));
  const [fecha, setFecha] = useState(existente?.fecha ?? "");
  const [cuerpo, setCuerpo] = useState(existente?.cuerpo ?? "");
  const [autorizada, setAutorizada] = useState(existente ? existente.autorizacion_imagen_en !== null : false);
  const [imagenPath, setImagenPath] = useState<string | null>(existente?.imagen_path ?? null);
  const [error, setError] = useState<string | null>(null);
  const [mensajeImagen, setMensajeImagen] = useState<string | null>(null);
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  const router = useRouter();

  function alEscribirTitulo(valor: string) {
    setTitulo(valor);
    if (!slugEditado) setSlug(slugDe(valor));
  }

  function alEscribirSlug(valor: string) {
    setSlugEditado(true);
    setSlug(valor);
  }

  async function guardar() {
    setError(null);
    if (titulo.trim().length < 3) return setError("El título es obligatorio.");
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return setError("Slug inválido: solo minúsculas, números y guiones.");
    if (!fecha) return setError("La fecha es obligatoria.");

    const resultado = await alGuardar({
      id: existente?.id,
      titulo: titulo.trim(),
      slug,
      fecha,
      cuerpo: cuerpo.trim() || undefined,
      autorizacionImagen: autorizada,
    });
    onGuardado(resultado);
    if (resultado.ok) alCerrar();
    else setError(resultado.error ?? "No se pudo guardar.");
  }

  async function subirImagen(archivo: File | null) {
    if (!archivo || !existente) return;
    setMensajeImagen(null);
    setSubiendoImagen(true);
    const resultado = await subirImagenCompetencia(existente.id, archivo);
    setSubiendoImagen(false);
    if (resultado.ok) {
      setImagenPath(resultado.imagenPath ?? imagenPath);
      setMensajeImagen("Imagen cargada.");
      router.refresh();
    } else {
      setMensajeImagen(resultado.error);
    }
  }

  return (
    <Modal
      abierto={competencia !== null}
      alCerrar={alCerrar}
      titulo={esNuevo ? "Nueva competencia" : `Editar — ${existente?.titulo ?? ""}`}
      className="sm:max-w-2xl"
    >
      <div className="flex flex-col gap-4">
        {error && <Aviso tono="error">{error}</Aviso>}
        <Campo
          etiqueta="Título"
          value={titulo}
          onChange={(e) => alEscribirTitulo(e.target.value)}
          maxLength={160}
          required
        />
        <Campo
          etiqueta="Slug"
          value={slug}
          onChange={(e) => alEscribirSlug(e.target.value)}
          maxLength={160}
          ayuda="Identificador en la URL pública. Se autogenera del título; puedes editarlo."
          error={slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ? "Solo minúsculas, números y guiones." : undefined}
        />
        <Campo etiqueta="Fecha de la competencia" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        <AreaTexto
          etiqueta="Cuerpo (texto plano)"
          value={cuerpo}
          onChange={(e) => setCuerpo(e.target.value)}
          maxLength={8000}
          rows={6}
          ayuda="Texto de la nota. Se guarda y se muestra tal cual: no admite HTML."
        />

        {/* Autorización de uso de imagen: condición para subir fotos. Queda
            registrada en la bitácora junto con quién la marcó. */}
        <label className="flex items-start gap-3 rounded-md border-2 border-gris-borde bg-gris-frio p-4 text-sm">
          <input
            type="checkbox"
            checked={autorizada}
            onChange={(e) => setAutorizada(e.target.checked)}
            className="mt-0.5 h-5 w-5 accent-rojo"
          />
          <span>
            <strong className="text-azul-profundo">Autorización de uso de imagen firmada</strong>
            <span className="mt-1 block text-texto-sec">
              En las fotos hay menores de edad. Al marcar esta casilla confirmas que existe la autorización firmada
              por el acudiente para todo el material que subas aquí. La confirmación queda registrada con tu
              usuario en la bitácora.
            </span>
          </span>
        </label>

        {existente && (
          <div className="flex flex-col gap-2">
            {autorizada ? (
              <Archivo
                etiqueta="Foto de la competencia"
                mimesPermitidos={MIMES_IMAGEN}
                descripcionTipos="JPEG, PNG, WebP o AVIF"
                maximoBytes={MAXIMO_IMAGEN_BYTES}
                ayuda="Se renombra a un identificador interno; el nombre original no llega al servidor de archivos."
                alSeleccionar={(a) => void subirImagen(a as File | null)}
                disabled={subiendoImagen}
              />
            ) : (
              <Aviso tono="aviso" titulo="Subida de fotos bloqueada">
                Marca la autorización de uso de imagen para habilitar la carga de fotos.
              </Aviso>
            )}
            {subiendoImagen && <p className="text-sm text-texto-sec">Subiendo imagen…</p>}
            {mensajeImagen && <Aviso tono={mensajeImagen.includes("cargada") ? "exito" : "error"}>{mensajeImagen}</Aviso>}
            {imagenPath && <p className="text-sm text-texto-sec">Imagen actual: {imagenPath}</p>}
          </div>
        )}
        {esNuevo && (
          <p className="text-sm text-texto-sec">
            Guarda el borrador para habilitar la subida de fotos y los resultados.
          </p>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-3 border-t border-gris-borde p-5 sm:flex-row sm:justify-end">
        <Boton variante="fantasma" onClick={alCerrar}>
          Cancelar
        </Boton>
        <Boton onClick={guardar}>{esNuevo ? "Guardar borrador" : "Guardar cambios"}</Boton>
      </div>
    </Modal>
  );
}

function slugDe(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
