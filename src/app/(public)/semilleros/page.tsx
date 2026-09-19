import type { Metadata } from "next";

import { Aparece } from "@/lib/animaciones";
import { Acordeon, BloqueCTA, Boton, HeroPagina, Seccion, SeccionTitulo } from "@/components/ui";
import { PREGUNTAS_SEMILLEROS } from "@/config/preguntas";
import { FichaNiveles } from "@/features/niveles/components/FichaNiveles";
import { listarNiveles } from "@/features/niveles/queries";

const TITULO = "Semilleros y niveles";
const DESCRIPCION =
  "La ruta de formación de la escuela de BMX TSW: semilleros y niveles con edades, horarios y criterios de promoción.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  openGraph: { title: `${TITULO} | TSW`, description: DESCRIPCION, type: "website" },
};

/** Niveles de formación. Server Component: los niveles se leen en el servidor. */
export default async function PaginaSemilleros() {
  const niveles = await listarNiveles();

  return (
    <>
      <HeroPagina
        antetitulo="Formación"
        titulo="Semilleros y niveles"
        bajada="Del primer contacto con la bicicleta a la competencia, con criterios de promoción claros en cada etapa."
      />

      <Seccion tituloId="titulo-niveles">
        <Aparece>
          <SeccionTitulo id="titulo-niveles" bajada="Elige un nivel para ver su ficha completa.">
            La ruta de formación
          </SeccionTitulo>
        </Aparece>
        <Aparece indice={1} className="mt-8">
          <FichaNiveles niveles={niveles} />
        </Aparece>
      </Seccion>

      <Seccion tono="claro" tituloId="titulo-preguntas">
        <Aparece>
          <SeccionTitulo id="titulo-preguntas">Preguntas frecuentes</SeccionTitulo>
        </Aparece>
        <Aparece indice={1} className="mt-8 max-w-3xl">
          <Acordeon items={PREGUNTAS_SEMILLEROS} />
        </Aparece>
      </Seccion>

      <BloqueCTA
        tituloId="titulo-cta-semilleros"
        titulo="¿Listo para empezar?"
        texto="Descarga los documentos de matrícula y radícalos en la sede."
        acciones={
          <Boton href="/matriculas" fondo="acento" tamano="lg">
            Ver documentos de matrícula
          </Boton>
        }
      />
    </>
  );
}
