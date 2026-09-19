import type { Metadata } from "next";

import { Aparece } from "@/lib/animaciones";
import { BloqueCTA, Boton, HeroPagina, Seccion, SeccionTitulo } from "@/components/ui";
import { CompetenciaDestacada } from "@/features/competencias/components/CompetenciaDestacada";
import {
  FiltroAnio,
  ProveedorFiltrosCompetencias,
} from "@/features/competencias/components/FiltrosCompetencias";
import { HistorialCompetencias } from "@/features/competencias/components/HistorialCompetencias";
import { aniosDisponibles, listarCompetenciasConResultados } from "@/features/competencias/queries";

const TITULO = "Competencias";
const DESCRIPCION = "Calendario y resultados de los riders de la escuela de BMX TSW, por año y categoría.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  openGraph: { title: `${TITULO} | TSW`, description: DESCRIPCION, type: "website" },
};

/**
 * Competencias publicadas con sus resultados. Server Component: una sola
 * consulta; la destacada sale de la misma lista y los filtros son islas de
 * cliente que comparten estado por contexto.
 */
export default async function PaginaCompetencias() {
  const competencias = await listarCompetenciasConResultados();
  const destacada = competencias.find((c) => c.destacado) ?? null;
  const anios = aniosDisponibles(competencias).map(String);

  return (
    <ProveedorFiltrosCompetencias anios={anios}>
      <HeroPagina
        antetitulo="Resultados"
        titulo="Competencias"
        bajada="Calendario y resultados de nuestros riders, válida por válida."
        lateral={<FiltroAnio />}
      />

      {destacada && (
        <Seccion tituloId="titulo-destacada">
          <Aparece>
            <SeccionTitulo id="titulo-destacada">Competencia destacada</SeccionTitulo>
          </Aparece>
          <Aparece indice={1} className="mt-8">
            <CompetenciaDestacada competencia={destacada} />
          </Aparece>
        </Seccion>
      )}

      <Seccion tono="claro" tituloId="titulo-historial">
        <Aparece>
          <SeccionTitulo id="titulo-historial" bajada="Filtra por año y por categoría.">
            Historial
          </SeccionTitulo>
        </Aparece>
        <Aparece indice={1} className="mt-8">
          <HistorialCompetencias competencias={competencias} />
        </Aparece>
      </Seccion>

      <BloqueCTA
        tituloId="titulo-cta-competencias"
        titulo="¿Quieres competir con el club?"
        texto="Conoce los semilleros y niveles: la ruta que lleva de la iniciación a la pista de competencia."
        acciones={
          <Boton href="/semilleros" fondo="acento" tamano="lg">
            Conocer los semilleros
          </Boton>
        }
      />
    </ProveedorFiltrosCompetencias>
  );
}
