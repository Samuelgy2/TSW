"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Aviso, AreaTexto, Archivo, Badge, Boton, Campo, ChipEstado, Modal, PieModal, TablaResponsiva, type ColumnaTabla } from "@/components/ui";
import { formatearFechaHora, formatearTamano } from "@/lib/utils";
import {
  alternarDocumento,
  guardarDocumento,
  prepararVersionDocumento,
  publicarVersionDocumento,
  subirPdfDocumento,
} from "../acciones-contenido";
import { MAXIMO_PDF_BYTES, MIMES_PDF } from "../constantes";
import type { DocumentoConVersiones, DocumentoVersion } from "../types";

type Resultado = { ok: boolean; error?: string; mensaje?: string };

/**
 * Módulo de documentos. Lo que NO ofrece: editar o eliminar una versión
 * publicada — documento_version es inmutable por diseño y el único camino es
 * publicar una versión nueva, que archiva la anterior. Ese botón es el único
 * que toca el archivo.
 */
export function DocumentosAdmin({ documentos }: { documentos: DocumentoConVersiones[] }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<Resultado | null>(null);
  const [editando, setEditando] = useState<DocumentoConVersiones | "nuevo" | null>(null);
  const [publicando, setPublicando] = useState<DocumentoConVersiones | null>(null);
  const [historial, setHistorial] = useState<DocumentoConVersiones | null>(null);

  function ejecutar(accion: () => Promise<Resultado>) {
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
      {aviso?.ok && aviso.mensaje && <Aviso tono="exito" titulo="Listo">{aviso.mensaje}</Aviso>}

      <div className="flex justify-end">
        <Boton onClick={() => setEditando("nuevo")} disabled={pendiente}>
          Nuevo documento
        </Boton>
      </div>

      <TablaResponsiva
        caption="Documentos de matrícula"
        filas={documentos}
        claveFila={(d) => d.id}
        columnas={[
          {
            clave: "titulo",
            titulo: "Documento",
            principal: true,
            render: (d) => (
              <span className="block max-w-[24rem] lg:max-w-none">
                {d.titulo}
                {d.descripcion && <span className="mt-1 block text-sm font-normal text-texto-sec">{d.descripcion}</span>}
              </span>
            ),
          },
          { clave: "estado", titulo: "Estado", render: (d) => <ChipEstado tipo="activo" valor={d.activo} /> },
          {
            clave: "version",
            titulo: "Versión vigente",
            render: (d) => {
              const vigente = d.versiones.find((v) => v.archivado_en === null);
              return vigente ? (
                <span className="whitespace-nowrap">
                  v{vigente.version} · {formatearTamano(vigente.tamano_bytes)}
                </span>
              ) : (
                <Badge tono="aviso">Sin archivo</Badge>
              );
            },
          },
          {
            clave: "edicion",
            titulo: "Última edición",
            render: (d) => <span className="whitespace-nowrap">{formatearFechaHora(d.actualizado_en)}</span>,
          },
          {
            clave: "acciones",
            titulo: "Acciones",
            alinear: "derecha",
            render: (d) => (
              <div className="flex flex-wrap justify-end gap-2">
                <Boton tamano="sm" variante="secundario" onClick={() => setPublicando(d)}>
                  Publicar versión
                </Boton>
                <Boton tamano="sm" variante="fantasma" onClick={() => setHistorial(d)}>
                  Historial
                </Boton>
                <Boton tamano="sm" variante="fantasma" onClick={() => setEditando(d)}>
                  Editar
                </Boton>
                <Boton
                  tamano="sm"
                  variante="fantasma"
                  disabled={pendiente}
                  onClick={() => ejecutar(() => alternarDocumento(d.id, !d.activo).then((r) => ({ ...r })))}
                >
                  {d.activo ? "Desactivar" : "Activar"}
                </Boton>
              </div>
            ),
          },
        ] satisfies ColumnaTabla<DocumentoConVersiones>[]}
      />

      {documentos.length === 0 && (
        <p className="rounded-lg border-2 border-dashed border-gris-borde bg-blanco px-6 py-10 text-center text-texto-sec">
          Todavía no hay documentos. Crea el primero con “Nuevo documento”.
        </p>
      )}

      <ModalDocumento
        documento={editando}
        alCerrar={() => setEditando(null)}
        alGuardar={guardarDocumento}
        onGuardado={(resultado) => {
          setAviso(resultado);
          if (resultado.ok) router.refresh();
        }}
      />

      {publicando && (
        <ModalPublicarVersion
          documento={publicando}
          alCerrar={() => setPublicando(null)}
          onListo={(mensaje) => {
            setPublicando(null);
            setAviso({ ok: true, mensaje });
            router.refresh();
          }}
        />
      )}

      <ModalHistorial documento={historial} alCerrar={() => setHistorial(null)} />
    </div>
  );
}

// --- Editor -----------------------------------------------------------------

function ModalDocumento({
  documento,
  alCerrar,
  alGuardar,
  onGuardado,
}: {
  documento: DocumentoConVersiones | "nuevo" | null;
  alCerrar: () => void;
  alGuardar: (entrada: { id?: string; titulo: string; descripcion?: string; activo: boolean; orden: number }) => Promise<Resultado>;
  onGuardado: (resultado: Resultado) => void;
}) {
  const [titulo, setTitulo] = useState(documento && documento !== "nuevo" ? documento.titulo : "");
  const [descripcion, setDescripcion] = useState(documento && documento !== "nuevo" ? documento.descripcion ?? "" : "");
  const [orden, setOrden] = useState(documento && documento !== "nuevo" ? documento.orden : 0);
  const [activo, setActivo] = useState(documento && documento !== "nuevo" ? documento.activo : true);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const esNuevo = documento === "nuevo";

  async function guardar() {
    setError(null);
    if (titulo.trim().length < 3) {
      setError("El título es obligatorio.");
      return;
    }
    setCargando(true);
    const resultado = await alGuardar({
      id: documento && documento !== "nuevo" ? documento.id : undefined,
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || undefined,
      activo,
      orden,
    });
    setCargando(false);
    onGuardado(resultado);
    if (resultado.ok) alCerrar();
    else setError(resultado.error ?? "No se pudo guardar.");
  }

  return (
    <Modal abierto={documento !== null} alCerrar={alCerrar} titulo={esNuevo ? "Nuevo documento" : "Editar documento"}>
      <div className="flex flex-col gap-4">
        {error && <Aviso tono="error">{error}</Aviso>}
        <Campo etiqueta="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={160} required />
        <AreaTexto
          etiqueta="Descripción"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          maxLength={500}
          ayuda="Para qué sirve y qué debe hacer el acudiente con él. La radicación es presencial."
        />
        <Campo
          etiqueta="Orden en la lista"
          type="number"
          min={0}
          value={orden}
          onChange={(e) => setOrden(Number(e.target.value) || 0)}
          ayuda="Menor aparece primero."
        />
        <label className="flex min-h-[44px] items-center gap-3 text-sm">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-5 w-5 accent-rojo" />
          Documento activo (visible en el sitio público)
        </label>
        <p className="text-sm text-texto-sec">
          El archivo se cambia publicando una versión nueva; esta pantalla no lo toca.
        </p>
      </div>
      <PieModal alCerrar={alCerrar} cargando={cargando} onGuardar={guardar} etiquetaGuardar="Guardar documento" />
    </Modal>
  );
}

function ModalPublicarVersion({
  documento,
  alCerrar,
  onListo,
}: {
  documento: DocumentoConVersiones;
  alCerrar: () => void;
  onListo: (mensaje: string) => void;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function publicar() {
    if (!archivo) {
      setError("Selecciona el PDF primero.");
      return;
    }
    setError(null);
    setCargando(true);

    // 1. Pedir el número de versión y armar la ruta versionada.
    const preparacion = await prepararVersionDocumento(documento.id);
    if (!preparacion.ok) {
      setError(preparacion.error);
      setCargando(false);
      return;
    }

    // 2. Subir el archivo a esa ruta.
    const subida = await subirPdfDocumento(preparacion.storagePath, archivo);
    if (!subida.ok) {
      setError(subida.error);
      setCargando(false);
      return;
    }

    // 3. Insertar la fila por RPC: el trigger archiva la versión anterior.
    const publicacion = await publicarVersionDocumento(
      {
        documentoId: documento.id,
        version: preparacion.version,
        storagePath: preparacion.storagePath,
        nombreArchivo: archivo.name.slice(0, 255),
        tamanoBytes: archivo.size,
      },
      archivo,
    );
    setCargando(false);

    if (publicacion.ok) onListo(publicacion.mensaje ?? "Versión publicada.");
    else setError(publicacion.error);
  }

  return (
    <Modal abierto alCerrar={alCerrar} titulo={`Publicar versión — ${documento.titulo}`}>
      <div className="flex flex-col gap-4">
        {error && <Aviso tono="error">{error}</Aviso>}
        <Aviso tono="info">
          Publicar una versión archiva la anterior y deja constancia en la bitácora. La versión anterior no se
          borra ni se puede editar después: esto es lo único que reemplaza el archivo vigente.
        </Aviso>
        <Archivo
          etiqueta="PDF nuevo"
          mimesPermitidos={MIMES_PDF}
          descripcionTipos="Solo PDF"
          maximoBytes={MAXIMO_PDF_BYTES}
          alSeleccionar={(a) => setArchivo(a as File | null)}
        />
      </div>
      <div className="mt-2 flex flex-col gap-3 border-t border-gris-borde p-5 sm:flex-row sm:justify-end">
        <Boton variante="fantasma" onClick={alCerrar} disabled={cargando}>
          Cancelar
        </Boton>
        <Boton onClick={publicar} cargando={cargando}>
          Publicar versión
        </Boton>
      </div>
    </Modal>
  );
}

// --- Historial (solo lectura) -------------------------------------------------

function ModalHistorial({ documento, alCerrar }: { documento: DocumentoConVersiones | null; alCerrar: () => void }) {
  return (
    <Modal abierto={documento !== null} alCerrar={alCerrar} titulo={`Historial — ${documento?.titulo ?? ""}`} className="sm:max-w-2xl">
      {documento && (
        <ul className="flex flex-col gap-3">
          {documento.versiones.map((v) => (
            <FilaVersion key={v.id} version={v} />
          ))}
          {documento.versiones.length === 0 && <p className="text-texto-sec">Este documento todavía no tiene versiones.</p>}
        </ul>
      )}
    </Modal>
  );
}

function FilaVersion({ version }: { version: DocumentoVersion }) {
  return (
    <li className="rounded-md border border-gris-borde p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-azul-profundo">Versión {version.version}</p>
        {version.archivado_en === null ? <Badge tono="exito">Vigente</Badge> : <Badge>Archivada</Badge>}
      </div>
      <p className="mt-2 text-texto-sec">
        Publicada el {formatearFechaHora(version.publicado_en)} · {formatearTamano(version.tamano_bytes)} ·{" "}
        {version.nombre_archivo}
      </p>
      <p className="mt-1 text-texto-sec">La versión es inmutable: no se edita ni se elimina.</p>
    </li>
  );
}
