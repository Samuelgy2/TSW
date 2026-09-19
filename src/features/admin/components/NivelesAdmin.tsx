"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Aviso, AreaTexto, Boton, Campo, ChipEstado, Modal } from "@/components/ui";
import { alternarNivel, guardarNivel, reordenarNiveles } from "../acciones-contenido";
import type { Nivel } from "../types";

type ResultadoAccion = { ok: boolean; error?: string; mensaje?: string };

/**
 * Módulo de niveles: semilleros y rutas formativas. Reordenar actualiza el
 * campo `orden` con la RPC reordenar_niveles, que escribe la secuencia
 * completa en una transacción (el UNIQUE de `orden` lo exige así).
 */
export function NivelesAdmin({ niveles }: { niveles: Nivel[] }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<ResultadoAccion | null>(null);
  const [editando, setEditando] = useState<Nivel | "nuevo" | null>(null);

  function ejecutar(accion: () => Promise<ResultadoAccion>) {
    setAviso(null);
    iniciar(async () => {
      const resultado = await accion();
      setAviso(resultado);
      if (resultado.ok) router.refresh();
    });
  }

  /** Mueve un nivel y manda el orden completo resultante. */
  function mover(indice: number, direccion: -1 | 1) {
    const ids = niveles.map((n) => n.id);
    const destino = indice + direccion;
    if (destino < 0 || destino >= ids.length) return;
    [ids[indice], ids[destino]] = [ids[destino]!, ids[indice]!];
    ejecutar(() => reordenarNiveles(ids));
  }

  return (
    <div className="flex flex-col gap-6">
      {aviso?.error && <Aviso tono="error">{aviso.error}</Aviso>}
      {aviso?.ok && aviso.mensaje && <Aviso tono="exito">{aviso.mensaje}</Aviso>}

      <div className="flex justify-end">
        <Boton onClick={() => setEditando("nuevo")}>Nuevo nivel</Boton>
      </div>

      {niveles.length === 0 && (
        <p className="rounded-lg border-2 border-dashed border-gris-borde bg-blanco px-6 py-10 text-center text-texto-sec">
          Todavía no hay niveles. Crea el primero: aparecerá en la página de semilleros.
        </p>
      )}

      <ol className="flex flex-col gap-3">
        {niveles.map((n, indice) => (
          <li key={n.id} className="rounded-lg border border-gris-borde bg-blanco p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-lg text-rojo" aria-hidden="true">
                    {indice + 1}
                  </span>
                  <ChipEstado tipo="activo" valor={n.activo} />
                </div>
                <h3 className="mt-1 text-lg">{n.nombre}</h3>
                <p className="text-sm text-texto-sec">
                  {[n.rango_edad, n.horario].filter(Boolean).join(" · ") || "Sin edades ni horario definidos"}
                </p>
                {n.criterio_promocion && (
                  <p className="mt-1 text-sm text-texto-sec">
                    <span className="font-semibold">Promoción:</span> {n.criterio_promocion}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Boton tamano="sm" variante="fantasma" disabled={pendiente || indice === 0} onClick={() => mover(indice, -1)}>
                  ↑ <span className="sr-only">Subir {n.nombre}</span>
                </Boton>
                <Boton
                  tamano="sm"
                  variante="fantasma"
                  disabled={pendiente || indice === niveles.length - 1}
                  onClick={() => mover(indice, 1)}
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

      <ModalNivel
        nivel={editando}
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
  alCerrar,
  alGuardar,
  onGuardado,
}: {
  nivel: Nivel | "nuevo" | null;
  alCerrar: () => void;
  alGuardar: (entrada: {
    id?: string;
    nombre: string;
    orden: number;
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

  const [nombre, setNombre] = useState(existente?.nombre ?? "");
  const [rangoEdad, setRangoEdad] = useState(existente?.rango_edad ?? "");
  const [horario, setHorario] = useState(existente?.horario ?? "");
  const [descripcion, setDescripcion] = useState(existente?.descripcion ?? "");
  const [criterio, setCriterio] = useState(existente?.criterio_promocion ?? "");
  const [activo, setActivo] = useState(existente?.activo ?? true);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function guardar() {
    setError(null);
    if (nombre.trim().length < 3) return setError("El nombre es obligatorio.");
    setCargando(true);
    const resultado = await alGuardar({
      id: existente?.id,
      nombre: nombre.trim(),
      // El orden lo asigna reordenar: uno más del máximo actual.
      orden: existente?.orden ?? 0,
      rangoEdad: rangoEdad.trim() || undefined,
      horario: horario.trim() || undefined,
      descripcion: descripcion.trim() || undefined,
      criterioPromocion: criterio.trim() || undefined,
      activo,
    });
    setCargando(false);
    onGuardado(resultado);
    if (resultado.ok) alCerrar();
    else setError(resultado.error ?? "No se pudo guardar.");
  }

  return (
    <Modal abierto={nivel !== null} alCerrar={alCerrar} titulo={esNuevo ? "Nuevo nivel" : `Editar — ${existente?.nombre ?? ""}`} className="sm:max-w-xl">
      <div className="flex flex-col gap-4">
        {error && <Aviso tono="error">{error}</Aviso>}
        <Campo etiqueta="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={120} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Rango de edad" value={rangoEdad} onChange={(e) => setRangoEdad(e.target.value)} maxLength={80} placeholder="6 a 9 años" />
          <Campo etiqueta="Horario" value={horario} onChange={(e) => setHorario(e.target.value)} maxLength={200} placeholder="Sáb 8:00–10:00" />
        </div>
        <AreaTexto etiqueta="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={1000} />
        <AreaTexto
          etiqueta="Criterio de promoción"
          value={criterio}
          onChange={(e) => setCriterio(e.target.value)}
          maxLength={500}
          ayuda="Qué debe lograr el deportista para pasar al siguiente nivel."
        />
        <label className="flex min-h-[44px] items-center gap-3 text-sm">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-5 w-5 accent-rojo" />
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
