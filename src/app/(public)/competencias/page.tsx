import type { Metadata } from "next";

import { Aparece } from "@/lib/animaciones";
import { BloqueCTA, Boton, HeroPagina, Seccion, SeccionTitulo } from "@/components/ui";
import { CompetenciaDestacada } from "@/features/competencias/components/CompetenciaDestacada";
import {
  FiltroAnio,
  ProveedorFiltrosCompetencias,
} from "@/features/competencias/components/FiltrosCompetencias";
import { HistorialCompetencias } from "@/features/competencias/components/HistorialCompetencias";
import { ProximaCompetencia } from "@/features/competencias/components/ProximaCompetencia";
import { aniosDisponibles, listarCompetenciasConResultados } from "@/features/competencias/queries";
import { obtenerDeportes } from "@/features/sitio/queries";
import { SelectorDeportePublico } from "@/features/publico/components/SelectorDeportePublico";
import { deporteDeParametros, enlaceConDeporte, type ParametrosBusqueda } from "@/features/publico/deporte-publico";

const TITULO = "Competencias";
const DESCRIPCION = "Calendario y resultados de los deportistas de la corporación TSW, por deporte, año y categoría.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  openGraph: { title: `${TITULO} | TSW`, description: DESCRIPCION, type: "website" },
};

type Props = { searchParams: Promise<ParametrosBusqueda> };

/** Día de hoy en Bogotá como "AAAA-MM-DD", comparable con `competencia.fecha`. */
function hoyEnBogota(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

/**
 * Competencias publicadas con sus resultados. Server Component: una sola
 * consulta; de la misma lista salen la próxima (fecha futura más cercana), la
 * destacada y el historial. Los filtros son islas de cliente con estado
 * compartido por contexto.
 *
 * El deporte todavía no filtra la consulta: la columna no existe. Se muestra
 * en la cabecera para que el recorrido por deporte sea el mismo que en el
 * resto del sitio.
 */
export default async function PaginaCompetencias({ searchParams }: Props) {
  const [competencias, deportes, parametros] = await Promise.all([
    listarCompetenciasConResultados(),
    obtenerDeportes(),
    searchParams,
  ]);
  const deporte = deporteDeParametros(parametros, deportes);
  const destacada = competencias.find((c) => c.destacado) ?? null;
  const anios = aniosDisponibles(competencias).map(String);

  const hoy = hoyEnBogota();
  // La lista viene en orden descendente: la última con fecha >= hoy es la más cercana.
  const proxima = [...competencias].reverse().find((c) => c.fecha >= hoy) ?? null;

  return (
    <ProveedorFiltrosCompetencias anios={anios}>
      <HeroPagina
        tono="oscuro"
        antetitulo="Resultados"
        titulo={`Competencias · ${deporte.nombre}`}
        bajada="Calendario y resultados de nuestros deportistas, válida por válida."
        lateral={
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <SelectorDeportePublico deportes={deportes} valor={deporte.id} fondo="oscuro" />
            <FiltroAnio />
          </div>
        }
      />

      <ProximaCompetencia competencia={proxima} />

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
            Resultados oficiales
          </SeccionTitulo>
        </Aparece>
        <Aparece indice={1} className="mt-8">
          <HistorialCompetencias competencias={competencias} />
        </Aparece>
      </Seccion>

      <BloqueCTA
        tituloId="titulo-cta-competencias"
        titulo="¿Quieres competir con la corporación?"
        texto="Conoce los semilleros y niveles: la ruta que lleva de la iniciación a la competencia."
        acciones={
          <Boton href={enlaceConDeporte("/semilleros", deporte.id)} fondo="franja" tamano="lg">
            Conocer los semilleros
          </Boton>
        }
      />
    </ProveedorFiltrosCompetencias>
  );
}
