"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { Filtros } from "@/components/ui";

export const TODAS_LAS_CATEGORIAS = "todas";

type EstadoFiltros = {
  anio: string;
  setAnio: (anio: string) => void;
  categoria: string;
  setCategoria: (categoria: string) => void;
  anios: string[];
};

const ContextoFiltros = createContext<EstadoFiltros | null>(null);

/**
 * Estado compartido de los filtros de competencias. El filtro de año vive en
 * el hero y la tabla más abajo: los dos son islas de cliente distintas dentro
 * de una página de servidor, así que comparten estado por contexto.
 */
export function ProveedorFiltrosCompetencias({ anios, children }: { anios: string[]; children: ReactNode }) {
  const [anio, setAnio] = useState(anios[0] ?? "");
  const [categoria, setCategoria] = useState(TODAS_LAS_CATEGORIAS);

  const valor = useMemo(
    () => ({ anio, setAnio, categoria, setCategoria, anios }),
    [anio, categoria, anios],
  );

  return <ContextoFiltros.Provider value={valor}>{children}</ContextoFiltros.Provider>;
}

export function useFiltrosCompetencias(): EstadoFiltros {
  const contexto = useContext(ContextoFiltros);
  if (!contexto) throw new Error("useFiltrosCompetencias necesita ProveedorFiltrosCompetencias.");
  return contexto;
}

/** Píldoras de año, para el lateral del hero. Sin años, no pinta nada. */
export function FiltroAnio() {
  const { anio, setAnio, setCategoria, anios } = useFiltrosCompetencias();
  if (anios.length === 0) return null;

  return (
    <Filtros
      etiqueta="Año de la competencia"
      opciones={anios.map((a) => ({ valor: a, etiqueta: a }))}
      valor={anio}
      alCambiar={(valor) => {
        setAnio(valor);
        // Cambiar de año puede dejar la categoría elegida sin filas: se vuelve a "todas".
        setCategoria(TODAS_LAS_CATEGORIAS);
      }}
    />
  );
}
