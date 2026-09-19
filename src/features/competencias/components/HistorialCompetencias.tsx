"use client";

import { useMemo } from "react";

import { EstadoVacio, Filtros, TablaResponsiva, type ColumnaTabla } from "@/components/ui";
import { formatearFecha } from "@/lib/utils";
import type { CompetenciaConResultados } from "../types";
import { TODAS_LAS_CATEGORIAS, useFiltrosCompetencias } from "./FiltrosCompetencias";

type Fila = {
  id: string;
  fecha: string;
  competencia: string;
  rider: string;
  categoria: string | null;
  puesto: number | null;
};

const COLUMNAS: ColumnaTabla<Fila>[] = [
  { clave: "fecha", titulo: "Fecha", render: (f) => formatearFecha(f.fecha), className: "whitespace-nowrap" },
  { clave: "competencia", titulo: "Competencia", principal: true, render: (f) => f.competencia },
  { clave: "rider", titulo: "Rider", render: (f) => f.rider },
  {
    clave: "resultado",
    titulo: "Resultado",
    render: (f) =>
      f.puesto === null ? (
        <span className="text-texto-sec">Pendiente</span>
      ) : (
        <span>
          <span className="font-display text-lg text-rojo">{f.puesto}.º</span>
          {f.categoria && <span className="ml-2 text-sm text-texto-sec">{f.categoria}</span>}
        </span>
      ),
  },
];

/**
 * Historial filtrado por año y categoría. Los datos llegan completos desde
 * el servidor y el filtrado es en memoria. Cada resultado es una fila; una
 * competencia sin resultados aparece una vez, marcada como pendiente.
 */
export function HistorialCompetencias({ competencias }: { competencias: CompetenciaConResultados[] }) {
  const { anio, categoria, setCategoria } = useFiltrosCompetencias();

  const delAnio = useMemo(
    () => competencias.filter((c) => c.fecha.startsWith(anio)),
    [competencias, anio],
  );

  const categorias = useMemo(() => {
    const unicas = new Set(delAnio.flatMap((c) => c.resultados.map((r) => r.categoria)));
    return [...unicas].sort((a, b) => a.localeCompare(b, "es"));
  }, [delAnio]);

  const filas = useMemo<Fila[]>(() => {
    const todas = categoria === TODAS_LAS_CATEGORIAS;
    return delAnio.flatMap((c): Fila[] => {
      const resultados = c.resultados.filter((r) => todas || r.categoria === categoria);
      if (resultados.length === 0) {
        return todas
          ? [{ id: c.id, fecha: c.fecha, competencia: c.titulo, rider: "—", categoria: null, puesto: null }]
          : [];
      }
      return resultados.map((r) => ({
        id: r.id,
        fecha: c.fecha,
        competencia: c.titulo,
        rider: r.rider,
        categoria: r.categoria,
        puesto: r.puesto,
      }));
    });
  }, [delAnio, categoria]);

  if (competencias.length === 0) {
    return (
      <EstadoVacio
        titulo="Todavía no hay competencias publicadas"
        texto="El calendario y los resultados aparecerán aquí en cuanto el club los publique."
      />
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {categorias.length > 0 ? (
          <Filtros
            etiqueta="Categoría"
            opciones={[
              { valor: TODAS_LAS_CATEGORIAS, etiqueta: "Todas las categorías" },
              ...categorias.map((c) => ({ valor: c, etiqueta: c })),
            ]}
            valor={categoria}
            alCambiar={setCategoria}
          />
        ) : (
          <span />
        )}
        <p role="status" className="text-sm text-texto-sec">
          {filas.length === 1 ? "1 resultado" : `${filas.length} resultados`} en {anio}
        </p>
      </div>

      {filas.length === 0 ? (
        <EstadoVacio
          className="mt-6"
          titulo={`Sin resultados en ${anio}`}
          texto="Prueba con otro año u otra categoría."
        />
      ) : (
        <TablaResponsiva
          className="mt-6"
          caption={`Historial de competencias de ${anio}`}
          columnas={COLUMNAS}
          filas={filas}
          claveFila={(f) => f.id}
        />
      )}
    </div>
  );
}
