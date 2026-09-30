import type { Metadata } from "next";

import { HeroPortal } from "@/components/home/HeroPortal";
import {
  CifrasPortal,
  CitaPortal,
  ClubesPortal,
  DocumentosPortal,
  PilaresPortal,
  SedePortal,
} from "@/components/home/SeccionesPortal";
import { BloqueCTA, Boton } from "@/components/ui";
import { SITIO } from "@/config/sitio";

import { listarSlidesCarrusel } from "@/features/carrusel/queries";
import { listarCompetenciasConResultados } from "@/features/competencias/queries";
import { UltimosResultados } from "@/features/competencias/components/UltimosResultados";
import { listarDocumentosPublicados } from "@/features/matriculas/queries";
import { listarClubes } from "@/features/clubes/queries";
import { obtenerPortada } from "@/features/sitio/queries";

export const metadata: Metadata = {
  description: SITIO.descripcion,
};

/**
 * Portada de la corporación, con la arquitectura del rediseño: hero dividido,
 * cifras, pilares, deportes, resultados recientes, cita, documentos, sede y
 * llamada a matrículas. Server Component: las dos consultas van en paralelo
 * y bajan renderizadas; lo único con estado es la cuenta ascendente.
 *
 * Los niveles y los productos destacados salieron de la portada: viven en
 * /semilleros y /tienda, a un clic desde las tarjetas de deporte y el menú.
 */
export default async function PaginaInicio() {
  const [competencias, documentos, clubes, portada, slidesCarrusel] = await Promise.all([
    listarCompetenciasConResultados(),
    listarDocumentosPublicados(),
    // Un fallo aquí no puede tumbar la portada: sin clubes, se omiten la tarjeta
    // del hero y la sección, como hace el menú del layout.
    listarClubes().catch((error) => {
      console.error("[portada] no se pudieron leer los clubes:", error);
      return [];
    }),
    obtenerPortada(),
    listarSlidesCarrusel(),
  ]);

  return (
    <>
      <HeroPortal clubes={clubes} portada={portada} slides={slidesCarrusel} />
      <CifrasPortal portada={portada} />
      <PilaresPortal portada={portada} />
      <ClubesPortal clubes={clubes} portada={portada} />
      <UltimosResultados competencias={competencias} />
      <CitaPortal portada={portada} />
      <DocumentosPortal documentos={documentos} />
      <SedePortal portada={portada} />
      <BloqueCTA
        tituloId="titulo-cta-portada"
        titulo="¿Tu hijo quiere entrenar con la corporación?"
        texto="Descarga los documentos de matrícula, diligéncialos y radícalos en la sede. Te contamos el proceso paso a paso."
        acciones={
          <>
            <Boton href="/matriculas" fondo="franja" tamano="lg">
              Ver matrículas
            </Boton>
            <Boton href="/tienda" fondo="franja" variante="secundario" tamano="lg">
              Dotación oficial
            </Boton>
          </>
        }
      />
    </>
  );
}
