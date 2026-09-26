import type { Metadata } from "next";

import { Aparece } from "@/lib/animaciones";
import {
  Aviso,
  Badge,
  BloqueCTA,
  Boton,
  BotonWhatsApp,
  Card,
  CardCuerpo,
  HeroPagina,
  Indicador,
  Seccion,
  SeccionTitulo,
} from "@/components/ui";
import { CONTACTO, SEDES_EN_LINEA, UBICACION } from "@/config/sitio";
import { ListaDocumentos } from "@/features/matriculas/components/ListaDocumentos";
import { PasosMatricula } from "@/features/matriculas/components/PasosMatricula";
import { listarDocumentosPublicados } from "@/features/matriculas/queries";
import { obtenerDeportes, obtenerMatriculas } from "@/features/sitio/queries";
import { interpolar } from "@/features/sitio/textos";
import { SelectorDeportePublico } from "@/features/publico/components/SelectorDeportePublico";
import { deporteDeParametros, type ParametrosBusqueda } from "@/features/publico/deporte-publico";

const TITULO = "Matrículas";
const DESCRIPCION =
  "Descarga los documentos de matrícula de la corporación deportiva TSW, diligéncialos y radícalos en la sede.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  openGraph: { title: `${TITULO} | TSW`, description: DESCRIPCION, type: "website" },
};

type Props = { searchParams: Promise<ParametrosBusqueda> };

/**
 * Proceso y documentos de matrícula, por deporte. Server Component: los
 * documentos se leen en el servidor; cupos, cierre y categorías son contenido
 * fijo (config/contenido.ts) hasta que el esquema tenga deporte y periodo.
 */
export default async function PaginaMatriculas({ searchParams }: Props) {
  const [documentos, deportes, matriculas, parametros] = await Promise.all([
    listarDocumentosPublicados(),
    obtenerDeportes(),
    obtenerMatriculas(),
    searchParams,
  ]);
  const deporte = deporteDeParametros(parametros, deportes);
  const { cupos, cierre } = matriculas;

  return (
    <>
      <HeroPagina
        tono="oscuro"
        antetitulo={matriculas.antetitulo}
        titulo={`Matrículas · ${deporte.nombre}`}
        bajada="Descarga los formatos, diligéncialos y entrégalos en la sede. La radicación es presencial y los cupos son limitados por categoría."
        lateral={<SelectorDeportePublico deportes={deportes} valor={deporte.id} fondo="oscuro" />}
      />

      <Seccion tono="oscuro" espaciado="compacto" className="border-t border-blanco/10" tituloId="titulo-cupos">
        <h2 id="titulo-cupos" className="sr-only">
          Cupos del periodo
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Aparece como="li">
            <Indicador
              variante="cifra"
              oscuro
              etiqueta="Cupos disponibles"
              valor={cupos.disponibles}
              detalle={cupos.detalle}
              progreso={cupos.ocupacion}
              className="h-full"
            />
          </Aparece>
          <Aparece como="li" indice={1}>
            <Indicador
              variante="cifra"
              oscuro
              etiqueta="Cierre ordinario"
              valor={cierre.fecha}
              detalle={cierre.detalle}
              className="h-full"
            />
          </Aparece>
          <Aparece como="li" indice={2} className="sm:col-span-2 xl:col-span-1">
            <Indicador
              variante="cifra"
              oscuro
              etiqueta="Sedes de radicación"
              valor={<span className="text-2xl sm:text-3xl">{SEDES_EN_LINEA}</span>}
              detalle={`${UBICACION} · ${CONTACTO.horario}`}
              className="h-full"
            />
          </Aparece>
        </ul>
      </Seccion>

      <Seccion espaciado="compacto">
        <Aparece>
          <Aviso
            variante="destacado"
            tono="error"
            titulo="La radicación es presencial"
            accion={
              <Boton href="#titulo-proceso" variante="secundario">
                Ver el proceso
              </Boton>
            }
          >
            Los formatos, la autorización de uso de imagen y el consentimiento para el tratamiento de datos de
            menores se entregan impresos y firmados en la sede. No se validan matrículas enviadas por correo ni
            por mensajería.
          </Aviso>
        </Aparece>
      </Seccion>

      <Seccion tituloId="titulo-proceso">
        <Aparece>
          <SeccionTitulo id="titulo-proceso" bajada="Cuatro pasos, del archivo a la carpeta radicada.">
            Hoja de ruta
          </SeccionTitulo>
        </Aparece>
        <Aparece indice={1} className="mt-8">
          <PasosMatricula matriculas={matriculas} />
        </Aparece>
      </Seccion>

      <Seccion tono="claro" tituloId="titulo-categorias">
        <Aparece>
          <SeccionTitulo
            id="titulo-categorias"
            bajada={interpolar(matriculas.categoriasBajada, { deporte: deporte.nombre })}
          >
            Categorías de vinculación
          </SeccionTitulo>
        </Aparece>
        <ul className="mt-8 grid gap-5 lg:grid-cols-2">
          {matriculas.categorias.map((categoria, i) => (
            <Aparece key={categoria.id} indice={i + 1} como="li">
              <Card className="h-full">
                <CardCuerpo className="flex h-full flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge tono={i === 0 ? "neutro" : "acento"}>{categoria.etiqueta}</Badge>
                    <span className="text-xs font-bold uppercase tracking-wide text-texto-sec">
                      Edades: {categoria.edades}
                    </span>
                  </div>
                  <h3 className="mt-4 text-2xl leading-tight">{categoria.titulo}</h3>
                  <p className="mt-2 flex-1 text-texto-sec">{categoria.texto}</p>
                </CardCuerpo>
              </Card>
            </Aparece>
          ))}
        </ul>
      </Seccion>

      <Seccion tituloId="titulo-documentos">
        <Aparece>
          <SeccionTitulo id="titulo-documentos" bajada={matriculas.documentosBajada}>
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
          <BotonWhatsApp fondo="franja" tamano="lg">
            Escribir por WhatsApp
          </BotonWhatsApp>
        }
      />
    </>
  );
}
