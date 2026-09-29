"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Aviso, Boton, Campo, Modal, PieModal, Tabs } from "@/components/ui";
import {
  guardarSeccionContenido,
  restablecerSeccionContenido,
} from "@/features/admin/acciones-sitio";
import type { ClubPanel, EdicionSeccion } from "@/features/admin/queries-contenido";
import { formatearFechaHora } from "@/lib/utils";
import { CampoImagenSitio } from "./CampoImagenSitio";
import { ListaEditable, ListaTextoEditable } from "./ListaEditable";
import { ClubesAdmin } from "./ClubesAdmin";
import { CarruselAdmin } from "./CarruselAdmin";
import type { SlideCarrusel } from "@/features/carrusel/types";
import type {
  ClaveContenido,
  EntradaDeportes,
  EntradaMatriculas,
  EntradaPortada,
  EntradaSemilleros,
  EntradaTienda,
} from "../schemas";

type Contenido = {
  deportes: EntradaDeportes;
  portada: EntradaPortada;
  matriculas: EntradaMatriculas;
  semilleros: EntradaSemilleros;
  tienda: EntradaTienda;
};

/** "clubes" y "carrusel" no son secciones de contenido_sitio: tablas propias con sus propias RPC. */
type Pestana = ClaveContenido | "clubes" | "carrusel";

const PESTANAS: { valor: Pestana; etiqueta: string }[] = [
  { valor: "deportes", etiqueta: "Deportes" },
  { valor: "portada", etiqueta: "Portada" },
  { valor: "matriculas", etiqueta: "Matrículas" },
  { valor: "semilleros", etiqueta: "Semilleros" },
  { valor: "tienda", etiqueta: "Tienda" },
  { valor: "clubes", etiqueta: "Clubes" },
  { valor: "carrusel", etiqueta: "Carrusel" },
];

/**
 * Pantalla de contenido editable del sitio (migración 19, contenido_sitio).
 *
 * Cinco secciones en pestañas. Cada una:
 *  · muestra quién la editó por última vez y cuándo, leído de la bitácora
 *    (features/admin/queries-contenido.ts), o que sigue en el valor de fábrica;
 *  · se guarda ENTERA con "Guardar sección" — reemplazo total, como todo
 *    `guardar_*` del panel: el formulario ES el estado completo;
 *  · se puede "Restablecer al valor por defecto", con un modal de confirmación
 *    porque borra el texto personalizado sin poder deshacerlo desde aquí.
 *
 * La validación corre DOS veces con el MISMO esquema Zod
 * (features/sitio/schemas.ts): aquí, para no dejar guardar algo roto sin ni
 * siquiera llamar al servidor, y en `guardarSeccionContenido`, que es la que
 * de verdad cuenta porque el cliente no es de fiar.
 */
export function SitioAdmin({
  contenidoInicial,
  ediciones,
  clubes,
  slidesCarrusel,
}: {
  contenidoInicial: Contenido;
  ediciones: Record<ClaveContenido, EdicionSeccion>;
  clubes: ClubPanel[];
  slidesCarrusel: SlideCarrusel[];
}) {
  const router = useRouter();
  const [pestana, setPestana] = useState<Pestana>("deportes");
  const [borrador, setBorrador] = useState<Contenido>(contenidoInicial);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tono: "exito" | "error"; texto: string } | null>(null);
  const [confirmarRestablecer, setConfirmarRestablecer] = useState(false);

  const esTablaPropia = pestana === "clubes" || pestana === "carrusel";
  const edicion = esTablaPropia ? null : ediciones[pestana];
  // TEMPORAL: los deportes ya viven en la tabla `deporte`; esta pestaña todavía
  // escribe en el JSON viejo, que nadie lee. Se bloquea hasta el formulario nuevo.
  const enMigracion = pestana === "deportes";

  async function guardar() {
    if (esTablaPropia || enMigracion) return;
    setGuardando(true);
    setMensaje(null);
    const resultado = await guardarSeccionContenido(pestana, borrador[pestana]);
    setGuardando(false);
    if (resultado.ok) {
      setMensaje({ tono: "exito", texto: resultado.mensaje ?? "Sección guardada." });
      router.refresh();
    } else {
      setMensaje({ tono: "error", texto: resultado.error });
    }
  }

  async function restablecer() {
    if (esTablaPropia) return;
    setGuardando(true);
    const resultado = await restablecerSeccionContenido(pestana);
    setGuardando(false);
    setConfirmarRestablecer(false);
    if (resultado.ok) {
      setMensaje({ tono: "exito", texto: resultado.mensaje ?? "Sección restablecida." });
      router.refresh();
    } else {
      setMensaje({ tono: "error", texto: resultado.error });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Tabs
        opciones={PESTANAS}
        valor={pestana}
        alCambiar={(valor) => {
          setPestana(valor as Pestana);
          setMensaje(null);
        }}
        etiqueta="Sección del sitio"
      >
        {edicion === null ? (
          <div className="mt-6">
            {pestana === "clubes" ? <ClubesAdmin clubes={clubes} /> : <CarruselAdmin slides={slidesCarrusel} />}
          </div>
        ) : (
        <div className="mt-6 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gris-borde bg-gris-frio p-4 text-sm text-texto-sec">
            <span>
              {edicion.personalizada ? (
                <>
                  Última edición:{" "}
                  <strong className="text-azul-profundo">{edicion.actor ?? "un administrador"}</strong> ·{" "}
                  {formatearFechaHora(edicion.actualizadoEn!)}
                </>
              ) : (
                "Sin personalizar: se muestra el valor por defecto del código."
              )}
            </span>
            <Boton
              variante="fantasma"
              tamano="sm"
              onClick={() => setConfirmarRestablecer(true)}
              disabled={!edicion.personalizada || guardando || enMigracion}
            >
              Restablecer al valor por defecto
            </Boton>
          </div>

          {enMigracion && (
            <Aviso tono="aviso" titulo="Deportes en migración">
              Los deportes pasaron a una tabla propia y la edición vuelve en breve. Mientras tanto no se puede guardar
              desde aquí: lo que se ve en el sitio no cambia.
            </Aviso>
          )}
          {mensaje && <Aviso tono={mensaje.tono}>{mensaje.texto}</Aviso>}

          {pestana === "deportes" && (
            <FormularioDeportes
              valor={borrador.deportes}
              alCambiar={(valor) => setBorrador((b) => ({ ...b, deportes: valor }))}
            />
          )}
          {pestana === "portada" && (
            <FormularioPortada
              valor={borrador.portada}
              alCambiar={(valor) => setBorrador((b) => ({ ...b, portada: valor }))}
            />
          )}
          {pestana === "matriculas" && (
            <FormularioMatriculas
              valor={borrador.matriculas}
              alCambiar={(valor) => setBorrador((b) => ({ ...b, matriculas: valor }))}
            />
          )}
          {pestana === "semilleros" && (
            <FormularioSemilleros
              valor={borrador.semilleros}
              alCambiar={(valor) => setBorrador((b) => ({ ...b, semilleros: valor }))}
            />
          )}
          {pestana === "tienda" && (
            <FormularioTienda
              valor={borrador.tienda}
              alCambiar={(valor) => setBorrador((b) => ({ ...b, tienda: valor }))}
            />
          )}

          <div className="flex justify-end border-t border-gris-borde pt-4">
            <Boton onClick={guardar} cargando={guardando} disabled={enMigracion}>
              Guardar sección
            </Boton>
          </div>
        </div>
        )}
      </Tabs>

      <Modal
        abierto={confirmarRestablecer}
        alCerrar={() => setConfirmarRestablecer(false)}
        titulo="¿Restablecer esta sección?"
        pie={
          <PieModal
            alCerrar={() => setConfirmarRestablecer(false)}
            onGuardar={restablecer}
            cargando={guardando}
            etiquetaGuardar="Restablecer"
          />
        }
      >
        <p>
          Se borra el texto personalizado de «{PESTANAS.find((p) => p.valor === pestana)?.etiqueta}» y vuelve a
          mostrarse el valor por defecto del código. Esta acción no se puede deshacer desde aquí: si quieres
          recuperar lo que había, tendrías que volver a escribirlo.
        </p>
      </Modal>
    </div>
  );
}

// --- Deportes ------------------------------------------------------------------

function FormularioDeportes({
  valor,
  alCambiar,
}: {
  valor: EntradaDeportes;
  alCambiar: (valor: EntradaDeportes) => void;
}) {
  function actualizarUno(indice: number, cambios: Partial<EntradaDeportes[number]>) {
    alCambiar(valor.map((d, i) => (i === indice ? { ...d, ...cambios } : d)));
  }

  return (
    <div className="flex flex-col gap-6">
      {valor.map((deporte, indice) => (
        <div key={deporte.id} className="rounded-lg border border-gris-borde bg-blanco p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-texto-sec">
            Deporte: {deporte.id}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo
              etiqueta="Nombre"
              value={deporte.nombre}
              onChange={(e) => actualizarUno(indice, { nombre: e.target.value })}
            />
            <Campo
              etiqueta="Categoría (etiqueta corta sobre la foto)"
              value={deporte.categoria}
              onChange={(e) => actualizarUno(indice, { categoria: e.target.value })}
            />
          </div>
          <div className="mt-3">
            <Campo
              etiqueta="Descripción"
              value={deporte.descripcion}
              onChange={(e) => actualizarUno(indice, { descripcion: e.target.value })}
            />
          </div>
          <div className="mt-3">
            <ListaTextoEditable
              etiqueta="Puntos destacados"
              items={deporte.puntos}
              alCambiar={(puntos) => actualizarUno(indice, { puntos })}
            />
          </div>
          <div className="mt-3">
            <Campo
              etiqueta="Pie de tarjeta"
              value={deporte.pie}
              onChange={(e) => actualizarUno(indice, { pie: e.target.value })}
            />
          </div>
          <div className="mt-3">
            <CampoImagenSitio
              etiqueta="Foto"
              valor={deporte.imagen}
              alCambiar={(imagen) => actualizarUno(indice, { imagen })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Portada -------------------------------------------------------------------

function FormularioPortada({ valor, alCambiar }: { valor: EntradaPortada; alCambiar: (valor: EntradaPortada) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo
          etiqueta="Etiqueta sobre el titular"
          value={valor.etiquetaEntidad}
          onChange={(e) => alCambiar({ ...valor, etiquetaEntidad: e.target.value })}
        />
        <Campo
          etiqueta="Aval (reconocimiento o afiliación)"
          value={valor.aval}
          onChange={(e) => alCambiar({ ...valor, aval: e.target.value })}
        />
      </div>
      <Campo
        etiqueta="Presentación (dos frases)"
        value={valor.presentacion}
        onChange={(e) => alCambiar({ ...valor, presentacion: e.target.value })}
      />

      <ListaEditable
        etiqueta="Cifras de la franja azul"
        items={valor.cifras.map((c, i) => ({ ...c, id: String(i) }))}
        campos={[
          { clave: "etiqueta", etiqueta: "Etiqueta" },
          { clave: "detalle", etiqueta: "Detalle" },
          { clave: "sufijo", etiqueta: "Sufijo (opcional, ej. +)" },
        ]}
        crearVacio={() => ({ id: String(valor.cifras.length), valor: null, sufijo: "", etiqueta: "", detalle: "" })}
        alCambiar={(cifras) =>
          alCambiar({
            ...valor,
            cifras: cifras.map((c) => ({ valor: c.valor, sufijo: c.sufijo, etiqueta: c.etiqueta, detalle: c.detalle })),
          })
        }
      />
      <Campo
        etiqueta="Texto cuando una cifra sigue sin dato"
        value={valor.cifraPendiente}
        onChange={(e) => alCambiar({ ...valor, cifraPendiente: e.target.value })}
      />

      <Campo
        etiqueta="Bajada de «Nuestros pilares»"
        value={valor.pilaresBajada}
        onChange={(e) => alCambiar({ ...valor, pilaresBajada: e.target.value })}
      />
      <ListaEditable
        etiqueta="Pilares institucionales"
        items={valor.pilares}
        campos={[
          { clave: "titulo", etiqueta: "Título" },
          { clave: "texto", etiqueta: "Texto", areaTexto: true },
          { clave: "pie", etiqueta: "Pie" },
        ]}
        crearVacio={() => ({ id: crypto.randomUUID(), titulo: "", texto: "", pie: "" })}
        alCambiar={(pilares) => alCambiar({ ...valor, pilares })}
      />

      <Campo
        etiqueta="Bajada de «Nuestros deportes»"
        value={valor.deportesBajada}
        onChange={(e) => alCambiar({ ...valor, deportesBajada: e.target.value })}
      />

      <fieldset className="flex flex-col gap-3 rounded-lg border border-gris-borde p-4">
        <legend className="px-1 text-sm font-semibold text-azul-profundo">Cita institucional</legend>
        <Campo
          etiqueta="Texto"
          value={valor.cita.texto}
          onChange={(e) => alCambiar({ ...valor, cita: { ...valor.cita, texto: e.target.value } })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo
            etiqueta="Autor"
            value={valor.cita.autor}
            onChange={(e) => alCambiar({ ...valor, cita: { ...valor.cita, autor: e.target.value } })}
          />
          <Campo
            etiqueta="Cargo"
            value={valor.cita.cargo}
            onChange={(e) => alCambiar({ ...valor, cita: { ...valor.cita, cargo: e.target.value } })}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3 rounded-lg border border-gris-borde p-4">
        <legend className="px-1 text-sm font-semibold text-azul-profundo">Sede</legend>
        <Campo
          etiqueta="Bajada de «Sede y atención»"
          value={valor.sedeBajada}
          onChange={(e) => alCambiar({ ...valor, sedeBajada: e.target.value })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo
            etiqueta="Nombre de la sede"
            value={valor.sede.nombre}
            onChange={(e) => alCambiar({ ...valor, sede: { ...valor.sede, nombre: e.target.value } })}
          />
          <Campo
            etiqueta="Texto alternativo de la foto"
            value={valor.sede.imagenAlt}
            onChange={(e) => alCambiar({ ...valor, sede: { ...valor.sede, imagenAlt: e.target.value } })}
          />
        </div>
        <Campo
          etiqueta="Descripción de la sede"
          value={valor.sede.descripcion}
          onChange={(e) => alCambiar({ ...valor, sede: { ...valor.sede, descripcion: e.target.value } })}
        />
        <CampoImagenSitio
          etiqueta="Foto de la sede"
          valor={valor.sede.imagen}
          alCambiar={(imagen) => alCambiar({ ...valor, sede: { ...valor.sede, imagen } })}
        />
        <ListaEditable
          etiqueta="Canales de atención"
          items={valor.sede.canales}
          campos={[
            { clave: "titulo", etiqueta: "Título" },
            { clave: "texto", etiqueta: "Texto" },
          ]}
          crearVacio={() => ({ id: crypto.randomUUID(), titulo: "", texto: "" })}
          alCambiar={(canales) => alCambiar({ ...valor, sede: { ...valor.sede, canales } })}
        />
      </fieldset>
    </div>
  );
}

// --- Matrículas ------------------------------------------------------------------

function FormularioMatriculas({
  valor,
  alCambiar,
}: {
  valor: EntradaMatriculas;
  alCambiar: (valor: EntradaMatriculas) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Campo
        etiqueta="Antetítulo (estado de la convocatoria)"
        value={valor.antetitulo}
        onChange={(e) => alCambiar({ ...valor, antetitulo: e.target.value })}
      />

      <fieldset className="flex flex-col gap-3 rounded-lg border border-gris-borde p-4">
        <legend className="px-1 text-sm font-semibold text-azul-profundo">Cupos del periodo</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo
            etiqueta="Cupos disponibles"
            value={valor.cupos.disponibles}
            onChange={(e) => alCambiar({ ...valor, cupos: { ...valor.cupos, disponibles: e.target.value } })}
          />
          <Campo
            etiqueta="Ocupación, 0 a 100 (vacío = sin barra)"
            type="number"
            min={0}
            max={100}
            value={valor.cupos.ocupacion ?? ""}
            onChange={(e) =>
              alCambiar({
                ...valor,
                cupos: { ...valor.cupos, ocupacion: e.target.value === "" ? null : Number(e.target.value) },
              })
            }
          />
        </div>
        <Campo
          etiqueta="Detalle de cupos"
          value={valor.cupos.detalle}
          onChange={(e) => alCambiar({ ...valor, cupos: { ...valor.cupos, detalle: e.target.value } })}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-3 rounded-lg border border-gris-borde p-4">
        <legend className="px-1 text-sm font-semibold text-azul-profundo">Cierre ordinario</legend>
        <Campo
          etiqueta="Fecha"
          value={valor.cierre.fecha}
          onChange={(e) => alCambiar({ ...valor, cierre: { ...valor.cierre, fecha: e.target.value } })}
        />
        <Campo
          etiqueta="Detalle"
          value={valor.cierre.detalle}
          onChange={(e) => alCambiar({ ...valor, cierre: { ...valor.cierre, detalle: e.target.value } })}
        />
      </fieldset>

      <Campo
        etiqueta="Bajada de categorías (usa {deporte} donde va el nombre del deporte)"
        value={valor.categoriasBajada}
        onChange={(e) => alCambiar({ ...valor, categoriasBajada: e.target.value })}
      />
      <ListaEditable
        etiqueta="Categorías de vinculación"
        items={valor.categorias}
        campos={[
          { clave: "etiqueta", etiqueta: "Etiqueta corta" },
          { clave: "titulo", etiqueta: "Título" },
          { clave: "texto", etiqueta: "Texto", areaTexto: true },
          { clave: "edades", etiqueta: "Edades" },
        ]}
        crearVacio={() => ({ id: crypto.randomUUID(), etiqueta: "", titulo: "", texto: "", edades: "" })}
        alCambiar={(categorias) => alCambiar({ ...valor, categorias })}
      />

      <Campo
        etiqueta="Bajada de documentos"
        value={valor.documentosBajada}
        onChange={(e) => alCambiar({ ...valor, documentosBajada: e.target.value })}
      />
      <Campo
        etiqueta="Firmas (paso 2)"
        value={valor.firmas}
        onChange={(e) => alCambiar({ ...valor, firmas: e.target.value })}
      />
      <ListaTextoEditable
        etiqueta="Anexos (paso 3)"
        items={[...valor.anexos]}
        alCambiar={(anexos) => alCambiar({ ...valor, anexos })}
      />
      <Campo
        etiqueta="Pie de anexos"
        value={valor.anexosPie}
        onChange={(e) => alCambiar({ ...valor, anexosPie: e.target.value })}
      />
    </div>
  );
}

// --- Semilleros ------------------------------------------------------------------

function FormularioSemilleros({
  valor,
  alCambiar,
}: {
  valor: EntradaSemilleros;
  alCambiar: (valor: EntradaSemilleros) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <ListaEditable
        etiqueta="Cifras de la metodología"
        items={valor.cifras}
        campos={[
          { clave: "etiqueta", etiqueta: "Etiqueta (ej. «3 niveles»)" },
          { clave: "valor", etiqueta: "Valor (vacío = sin dato)" },
          { clave: "detalle", etiqueta: "Detalle", areaTexto: true },
        ]}
        crearVacio={() => ({ id: crypto.randomUUID(), etiqueta: "", valor: "", detalle: "" })}
        alCambiar={(cifras) => alCambiar({ ...valor, cifras })}
      />
      <ListaEditable
        etiqueta="Preguntas frecuentes"
        items={valor.preguntas}
        campos={[
          { clave: "titulo", etiqueta: "Pregunta" },
          { clave: "contenido", etiqueta: "Respuesta", areaTexto: true },
        ]}
        crearVacio={() => ({ id: crypto.randomUUID(), titulo: "", contenido: "" })}
        alCambiar={(preguntas) => alCambiar({ ...valor, preguntas })}
      />
    </div>
  );
}

// --- Tienda ------------------------------------------------------------------------

function FormularioTienda({ valor, alCambiar }: { valor: EntradaTienda; alCambiar: (valor: EntradaTienda) => void }) {
  return (
    <ListaEditable
      etiqueta="Beneficios de la tienda"
      items={valor.beneficios}
      campos={[
        { clave: "titulo", etiqueta: "Título" },
        { clave: "texto", etiqueta: "Texto" },
      ]}
      crearVacio={() => ({ id: crypto.randomUUID(), titulo: "", texto: "" })}
      alCambiar={(beneficios) => alCambiar({ ...valor, beneficios })}
    />
  );
}
