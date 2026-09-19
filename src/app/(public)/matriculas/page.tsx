import type { Metadata } from "next";

import { Aparece } from "@/lib/animaciones";
import { BloqueCTA, Boton, HeroPagina, Seccion, SeccionTitulo } from "@/components/ui";
import { CONTACTO } from "@/config/sitio";
import { ListaDocumentos } from "@/features/matriculas/components/ListaDocumentos";
import { PasosMatricula } from "@/features/matriculas/components/PasosMatricula";
import { listarDocumentosPublicados } from "@/features/matriculas/queries";

const TITULO = "Matrículas";
const DESCRIPCION =
  "Descarga los documentos de matrícula de la escuela de BMX TSW, diligéncialos y radícalos en la sede.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  openGraph: { title: `${TITULO} | TSW`, description: DESCRIPCION, type: "website" },
};

/** Documentos de matrícula. Server Component: la lista se lee en el servidor. */
export default async function PaginaMatriculas() {
  const documentos = await listarDocumentosPublicados();

  return (
    <>
      <HeroPagina
        tono="oscuro"
        antetitulo="Matrículas"
        titulo="Documentos de matrícula"
        bajada="Descarga los formatos, diligéncialos y entrégalos en la sede. La radicación es presencial."
      />

      <Seccion tituloId="titulo-proceso">
        <Aparece>
          <SeccionTitulo id="titulo-proceso" bajada="Cuatro pasos, del archivo a la carpeta radicada.">
            Cómo matricularse
          </SeccionTitulo>
        </Aparece>
        <Aparece indice={1} className="mt-8">
          <PasosMatricula />
        </Aparece>
      </Seccion>

      <Seccion tono="claro" tituloId="titulo-documentos">
        <Aparece>
          <SeccionTitulo
            id="titulo-documentos"
            bajada="Cada archivo indica su versión vigente y su fecha de publicación."
          >
            Documentos para descargar
          </SeccionTitulo>
        </Aparece>
        <div className="mt-8">
          <ListaDocumentos documentos={documentos} />
        </div>
      </Seccion>

      <BloqueCTA
        tituloId="titulo-contacto-matriculas"
        titulo="¿Dudas con la matrícula?"
        texto="Escríbenos y te contamos qué documentos necesitas y cuándo puedes radicarlos."
        acciones={
          <Boton href={CONTACTO.whatsapp} externo fondo="acento" tamano="lg">
            Escribir por WhatsApp
          </Boton>
        }
      />
    </>
  );
}
