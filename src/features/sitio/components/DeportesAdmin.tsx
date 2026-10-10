"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type Dispatch, type SetStateAction } from "react";

import { AreaTexto, Archivo, Aviso, Badge, Boton, Campo, Modal, PieModal } from "@/components/ui";
import {
  alternarDeporte,
  confirmarImagenDeporte,
  crearDeporte,
  guardarDeporte,
  prepararImagenDeporte,
  quitarImagenDeporte,
} from "@/features/admin/acciones-sitio";
import type { DeportePanel } from "@/features/admin/queries-contenido";
import { esquemaDeportePanel, esquemaNuevoDeporte } from "@/features/admin/schemas";
import { subirDirecto } from "@/features/admin/subir-directo";
import { elegirDeporte } from "@/features/cuenta/acciones-vista-previa";
import { MAXIMO_IMAGEN_SITIO_BYTES, MIMES_IMAGEN_SITIO, resolverImagenSitio } from "../imagenes";
import { ListaTextoEditable } from "./ListaEditable";

type Mensaje = { tono: "exito" | "error"; texto: string } | null;

const TODOS = "todos";

/**
 * Pestaña "Deportes" (migración 22). Depende del selector del panel:
 *
 *  · "Marca TSW (todos)": la lista de todos los deportes, con Desactivar y
 *    Reactivar. Es el ÚNICO sitio donde se puede desactivar.
 *  · Un deporte concreto: el formulario de ESE deporte. Si está desactivado, los
 *    campos quedan bloqueados y solo se ofrece Reactivar.
 *
 * "No se puede desactivar el último activo" se resuelve en dos capas: el botón
 * ya sale deshabilitado, con el motivo escrito debajo (un botón deshabilitado no
 * recibe foco, así que el motivo no puede ser un tooltip); y, si la lista
 * estuviera desactualizada o dos administradores actuaran a la vez, la RPC lo
 * rechaza y su mensaje se muestra tal cual, tras lo cual se recarga la lista.
 */
export function DeportesAdmin({ deportes, seleccionado }: { deportes: DeportePanel[]; seleccionado: string }) {
  if (deportes.length === 0) {
    return <Aviso tono="info">Todavía no hay deportes registrados.</Aviso>;
  }

  if (seleccionado === TODOS) return <ListaDeportes deportes={deportes} />;

  const deporte = deportes.find((d) => d.slug === seleccionado);
  if (!deporte) {
    return <Aviso tono="info">Elige un deporte en el selector del panel, o «Marca TSW (todos)» para ver la lista.</Aviso>;
  }
  return <FichaDeporte key={deporte.id} deporte={deporte} />;
}

/** Texto que explica por qué no se puede desactivar el último activo. */
const MOTIVO_UNICO_ACTIVO = "Es el único deporte activo. Activa otro antes de desactivar este.";

// --- Lista (Marca TSW) -----------------------------------------------------------

function ListaDeportes({ deportes }: { deportes: DeportePanel[] }) {
  const router = useRouter();
  const [pendiente, setPendiente] = useState<string | null>(null);
  const [aDesactivar, setADesactivar] = useState<DeportePanel | null>(null);
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const [creando, setCreando] = useState(false);

  const activos = deportes.filter((d) => d.activo).length;

  async function cambiarEstado(deporte: DeportePanel, activo: boolean) {
    setPendiente(deporte.id);
    setMensaje(null);
    const resultado = await alternarDeporte(deporte.id, activo);
    setPendiente(null);
    setADesactivar(null);
    if (resultado.ok) {
      setMensaje({ tono: "exito", texto: `${deporte.nombre}: ${resultado.mensaje ?? "listo"}` });
    } else {
      // Mensaje de la RPC, sin maquillar (p. ej. la regla del último activo).
      setMensaje({ tono: "error", texto: resultado.error });
    }
    // También tras un rechazo: la lista mostrada puede estar desactualizada.
    router.refresh();
  }

  async function editar(deporte: DeportePanel) {
    setPendiente(deporte.id);
    await elegirDeporte(deporte.slug);
    setPendiente(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <Boton tamano="sm" onClick={() => setCreando(true)} className="self-start">
        Agregar deporte
      </Boton>
      <ModalNuevoDeporte abierto={creando} alCerrar={() => setCreando(false)} />

      {mensaje && <Aviso tono={mensaje.tono}>{mensaje.texto}</Aviso>}

      <ul className="flex flex-col gap-3">
        {deportes.map((deporte) => {
          const esUnicoActivo = deporte.activo && activos === 1;
          const motivoId = `motivo-${deporte.id}`;
          const ocupado = pendiente === deporte.id;
          return (
            <li key={deporte.id} className="flex flex-col gap-3 rounded-md border border-gris-borde p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-display text-xl text-azul-profundo">{deporte.nombre}</h3>
                <Badge tono={deporte.activo ? "acento" : "neutro"}>{deporte.activo ? "Activo" : "Desactivado"}</Badge>
                <span className="text-xs text-texto-sec">{deporte.slug}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Boton variante="secundario" tamano="sm" onClick={() => void editar(deporte)} disabled={ocupado}>
                  Editar
                </Boton>
                {deporte.activo ? (
                  <Boton
                    variante="fantasma"
                    tamano="sm"
                    onClick={() => setADesactivar(deporte)}
                    disabled={ocupado || esUnicoActivo}
                    aria-describedby={esUnicoActivo ? motivoId : undefined}
                  >
                    Desactivar
                  </Boton>
                ) : (
                  <Boton
                    variante="secundario"
                    tamano="sm"
                    onClick={() => void cambiarEstado(deporte, true)}
                    cargando={ocupado}
                  >
                    Reactivar
                  </Boton>
                )}
              </div>

              {esUnicoActivo && (
                <p id={motivoId} className="text-sm text-texto-sec">
                  {MOTIVO_UNICO_ACTIVO}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <Modal
        abierto={aDesactivar !== null}
        alCerrar={() => setADesactivar(null)}
        titulo={`¿Desactivar ${aDesactivar?.nombre ?? "el deporte"}?`}
        pie={
          <PieModal
            alCerrar={() => setADesactivar(null)}
            onGuardar={() => aDesactivar && void cambiarEstado(aDesactivar, false)}
            cargando={pendiente !== null}
            etiquetaGuardar="Desactivar"
          />
        }
      >
        <p>
          Deja de verse en el sitio público —en el hero, en «Nuestros deportes» y en los enlaces— y también se ocultan
          las diapositivas del carrusel etiquetadas con este deporte. No se borra nada: lo puedes reactivar cuando
          quieras.
        </p>
      </Modal>
    </div>
  );
}

// --- Campos compartidos por «Agregar deporte» y la ficha ---------------------------

type BorradorDeporte = { nombre: string; categoria: string; descripcion: string; puntos: string[]; pie: string };

const BORRADOR_VACIO: BorradorDeporte = { nombre: "", categoria: "", descripcion: "", puntos: [], pie: "" };

function CamposDeporte({
  borrador,
  setBorrador,
}: {
  borrador: BorradorDeporte;
  setBorrador: Dispatch<SetStateAction<BorradorDeporte>>;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo
          etiqueta="Nombre"
          required
          maxLength={60}
          value={borrador.nombre}
          onChange={(e) => setBorrador((b) => ({ ...b, nombre: e.target.value }))}
        />
        <Campo
          etiqueta="Categoría (etiqueta corta sobre la foto)"
          maxLength={80}
          value={borrador.categoria}
          onChange={(e) => setBorrador((b) => ({ ...b, categoria: e.target.value }))}
        />
      </div>
      <AreaTexto
        etiqueta="Descripción"
        maxLength={600}
        rows={4}
        value={borrador.descripcion}
        onChange={(e) => setBorrador((b) => ({ ...b, descripcion: e.target.value }))}
      />
      <ListaTextoEditable
        etiqueta="Puntos destacados"
        items={borrador.puntos}
        alCambiar={(puntos) => setBorrador((b) => ({ ...b, puntos }))}
      />
      <Campo
        etiqueta="Pie de tarjeta"
        maxLength={120}
        value={borrador.pie}
        onChange={(e) => setBorrador((b) => ({ ...b, pie: e.target.value }))}
      />
    </>
  );
}

/** Modal de alta. El deporte nace desactivado; la foto se sube desde su ficha. */
function ModalNuevoDeporte({ abierto, alCerrar }: { abierto: boolean; alCerrar: () => void }) {
  const router = useRouter();
  const [borrador, setBorrador] = useState(BORRADOR_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crear() {
    setError(null);
    const validado = esquemaNuevoDeporte.safeParse(borrador);
    if (!validado.success) {
      setError(validado.error.issues[0]?.message ?? "Revisa los datos.");
      return;
    }
    setGuardando(true);
    const resultado = await crearDeporte(validado.data);
    setGuardando(false);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    setBorrador(BORRADOR_VACIO);
    alCerrar();
    router.refresh();
  }

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Agregar deporte"
      pie={<PieModal alCerrar={alCerrar} onGuardar={() => void crear()} cargando={guardando} etiquetaGuardar="Crear deporte" />}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-texto-sec">
          Se crea <strong>desactivado</strong>: no se ve en el sitio hasta que lo actives. El identificador de la URL sale
          del nombre y no se puede cambiar después.
        </p>
        {error && <Aviso tono="error">{error}</Aviso>}
        <CamposDeporte borrador={borrador} setBorrador={setBorrador} />
      </div>
    </Modal>
  );
}

// --- Ficha de un deporte -----------------------------------------------------------

function FichaDeporte({ deporte }: { deporte: DeportePanel }) {
  const router = useRouter();
  const [borrador, setBorrador] = useState({
    nombre: deporte.nombre,
    categoria: deporte.categoria,
    descripcion: deporte.descripcion,
    puntos: deporte.puntos,
    pie: deporte.pie,
  });
  const [ruta, setRuta] = useState(deporte.imagen_path);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [reactivando, setReactivando] = useState(false);
  const [mensajeDatos, setMensajeDatos] = useState<Mensaje>(null);
  const [mensajeFoto, setMensajeFoto] = useState<Mensaje>(null);
  const [mensajeEstado, setMensajeEstado] = useState<Mensaje>(null);

  const bloqueado = !deporte.activo;
  const urlFoto = resolverImagenSitio(ruta);

  async function guardar() {
    setMensajeDatos(null);
    const validado = esquemaDeportePanel.safeParse({ id: deporte.id, ...borrador });
    if (!validado.success) {
      setMensajeDatos({ tono: "error", texto: validado.error.issues[0]?.message ?? "Revisa los datos." });
      return;
    }
    setGuardando(true);
    const resultado = await guardarDeporte(validado.data);
    setGuardando(false);
    if (resultado.ok) {
      setMensajeDatos({ tono: "exito", texto: resultado.mensaje ?? "Deporte guardado." });
      router.refresh();
    } else {
      setMensajeDatos({ tono: "error", texto: resultado.error });
    }
  }

  async function subirFoto(archivo: File | null) {
    // `Archivo` avisa con null cuando el elegido no pasó su validación.
    if (!archivo) return;
    setSubiendo(true);
    setMensajeFoto(null);
    const resultado = await subirDirecto(
      archivo,
      { mimesPermitidos: MIMES_IMAGEN_SITIO, maximoBytes: MAXIMO_IMAGEN_SITIO_BYTES },
      (mime, tamano) => prepararImagenDeporte(deporte.id, mime, tamano),
      (rutaSubida) => confirmarImagenDeporte(deporte.id, rutaSubida),
    );
    setSubiendo(false);
    if (resultado.ok) {
      setRuta(resultado.ruta ?? ruta);
      setMensajeFoto({ tono: "exito", texto: resultado.mensaje ?? "Foto cargada." });
      router.refresh();
    } else {
      setMensajeFoto({ tono: "error", texto: resultado.error });
    }
  }

  async function quitarFoto() {
    setSubiendo(true);
    setMensajeFoto(null);
    const resultado = await quitarImagenDeporte(deporte.id);
    setSubiendo(false);
    if (resultado.ok) {
      setRuta(null);
      setMensajeFoto({ tono: "exito", texto: resultado.mensaje ?? "Foto quitada." });
      router.refresh();
    } else {
      setMensajeFoto({ tono: "error", texto: resultado.error });
    }
  }

  async function reactivar() {
    setReactivando(true);
    setMensajeEstado(null);
    const resultado = await alternarDeporte(deporte.id, true);
    setReactivando(false);
    if (resultado.ok) {
      router.refresh();
    } else {
      setMensajeEstado({ tono: "error", texto: resultado.error });
    }
  }

  return (
    <section aria-labelledby={`deporte-${deporte.id}`} className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 id={`deporte-${deporte.id}`} className="font-display text-xl text-azul-profundo">
          {deporte.nombre}
        </h3>
        <Badge tono={deporte.activo ? "acento" : "neutro"}>{deporte.activo ? "Activo" : "Desactivado"}</Badge>
        <span className="text-xs text-texto-sec">{deporte.slug}</span>
      </div>

      {bloqueado ? (
        <Aviso
          tono="aviso"
          variante="destacado"
          titulo="Este deporte está desactivado"
          accion={
            <Boton tamano="sm" onClick={reactivar} cargando={reactivando}>
              Reactivar
            </Boton>
          }
        >
          No se ve en el sitio ni en sus diapositivas, y sus datos están bloqueados. Reactívalo para editarlo.
          {mensajeEstado && <span className="mt-2 block font-semibold">{mensajeEstado.texto}</span>}
        </Aviso>
      ) : (
        <p className="text-sm text-texto-sec">
          Para desactivar este deporte, cambia el selector del panel a «Marca TSW (todos)».
        </p>
      )}

      {/* fieldset disabled bloquea de una vez campos, botones y el selector de archivo. */}
      <fieldset disabled={bloqueado} className="flex min-w-0 flex-col gap-5 border-0 p-0">
        <legend className="sr-only">Datos de {deporte.nombre}</legend>

        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold text-azul-profundo">Foto</h4>
          {mensajeFoto && <Aviso tono={mensajeFoto.tono}>{mensajeFoto.texto}</Aviso>}
          {urlFoto && (
            <div className="relative h-32 w-full max-w-xs overflow-hidden rounded-md border border-gris-borde bg-gris-frio">
              <Image src={urlFoto} alt="" fill sizes="320px" className="object-cover" />
            </div>
          )}
          <Archivo
            etiqueta={subiendo ? "Subiendo…" : ruta ? "Cambiar foto" : "Subir foto"}
            mimesPermitidos={MIMES_IMAGEN_SITIO}
            descripcionTipos="JPG, PNG o WebP"
            maximoBytes={MAXIMO_IMAGEN_SITIO_BYTES}
            ayuda="Hasta 10 MB. Se guarda al subirla."
            disabled={subiendo}
            alSeleccionar={(archivo) => void subirFoto(archivo as File | null)}
          />
          {ruta && (
            <Boton variante="fantasma" tamano="sm" onClick={quitarFoto} disabled={subiendo} className="self-start">
              Quitar foto
            </Boton>
          )}
        </div>

        <div className="flex flex-col gap-4 border-t border-gris-borde pt-4">
          <h4 className="text-sm font-semibold text-azul-profundo">Datos del deporte</h4>
          {mensajeDatos && <Aviso tono={mensajeDatos.tono}>{mensajeDatos.texto}</Aviso>}
          <CamposDeporte borrador={borrador} setBorrador={setBorrador} />
          <div className="flex justify-end">
            <Boton onClick={guardar} cargando={guardando}>
              Guardar deporte
            </Boton>
          </div>
        </div>
      </fieldset>
    </section>
  );
}
