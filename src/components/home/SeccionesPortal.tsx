import Image from "next/image";

import { Aparece } from "@/lib/animaciones";
import { Card, CardCuerpo, CuentaAscendente, Indicador, ItemDescarga, Seccion, SeccionTitulo, TarjetaDeporte } from "@/components/ui";
import { BUCKET_DOCUMENTOS, type DocumentoConVersion } from "@/features/matriculas/types";
import { resolverImagenSitio } from "@/features/sitio/imagenes";
import type { EntradaDeportes, EntradaPortada } from "@/features/sitio/schemas";
import { urlPublicaStorage } from "@/lib/supabase/storage";
import { cn, formatearFecha } from "@/lib/utils";

/**
 * Secciones de la portada de la corporación, en el orden del rediseño. Todas
 * son Server Components; lo único con estado es la cuenta ascendente de las
 * cifras. `deportes` y `portada` llegan como props desde la página: contenido
 * editable en /admin/sitio (migración 19), con config/contenido.ts como
 * respaldo.
 */

/** Fila de cuatro cifras sobre azul profundo, con cuenta ascendente cuando hay dato. */
export function CifrasPortal({ portada }: { portada: EntradaPortada }) {
  return (
    <Seccion tono="oscuro" tituloId="titulo-cifras" espaciado="compacto" className="border-t border-blanco/10">
      <h2 id="titulo-cifras" className="sr-only">
        Cifras de la corporación
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {portada.cifras.map((cifra, i) => (
          <Aparece key={cifra.etiqueta} indice={i} como="li">
            <Indicador
              variante="cifra"
              oscuro
              etiqueta={cifra.etiqueta}
              valor={
                cifra.valor === null ? (
                  "[CIFRA]"
                ) : (
                  <>
                    <CuentaAscendente hasta={cifra.valor} />
                    {cifra.sufijo}
                  </>
                )
              }
              detalle={cifra.valor === null ? portada.cifraPendiente : cifra.detalle}
              className="h-full"
            />
          </Aparece>
        ))}
      </ul>
    </Seccion>
  );
}

/** Tres pilares institucionales con ícono, título, texto y remate. */
export function PilaresPortal({ portada }: { portada: EntradaPortada }) {
  return (
    <Seccion tono="claro" tituloId="titulo-pilares">
      <Aparece>
        <SeccionTitulo id="titulo-pilares" bajada={portada.pilaresBajada}>
          Nuestros pilares
        </SeccionTitulo>
      </Aparece>
      <ul className="mt-8 grid gap-5 md:grid-cols-3">
        {portada.pilares.map((pilar, i) => (
          <Aparece key={pilar.id} indice={i + 1} como="li">
            <Card className="h-full">
              <CardCuerpo className="flex h-full flex-col">
                <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-md bg-azul-profundo text-blanco">
                  <span className="h-2.5 w-2.5 rounded-full bg-acento-oscuro" />
                </span>
                <h3 className="mt-5 text-xl leading-tight">{pilar.titulo}</h3>
                <p className="mt-2 flex-1 text-texto-sec">{pilar.texto}</p>
                <p className="mt-5 text-xs font-bold uppercase tracking-wide text-acento-oscuro">{pilar.pie}</p>
              </CardCuerpo>
            </Card>
          </Aparece>
        ))}
      </ul>
    </Seccion>
  );
}

/** Una tarjeta por deporte de la corporación. */
export function DeportesPortal({ deportes, portada }: { deportes: EntradaDeportes; portada: EntradaPortada }) {
  // Con dos deportes, dos columnas: una cuadrícula de tres con un hueco se ve rota.
  const columnas = deportes.length >= 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2";

  return (
    <Seccion tituloId="titulo-deportes">
      <Aparece>
        <SeccionTitulo id="titulo-deportes" bajada={portada.deportesBajada}>
          Nuestros deportes
        </SeccionTitulo>
      </Aparece>
      <ul className={cn("mt-8 grid gap-5", columnas)}>
        {deportes.map((deporte, i) => (
          <Aparece key={deporte.id} indice={i + 1} como="li">
            <TarjetaDeporte
              nombre={deporte.nombre}
              categoria={deporte.categoria}
              descripcion={deporte.descripcion}
              puntos={deporte.puntos}
              imagen={resolverImagenSitio(deporte.imagen)}
              href={`/semilleros?deporte=${deporte.id}`}
              etiquetaEnlace="Ver semilleros"
              pie={deporte.pie}
              className="h-full"
            />
          </Aparece>
        ))}
      </ul>
    </Seccion>
  );
}

/** Cita institucional: una tarjeta ancha con autor y cargo como placeholders. */
export function CitaPortal({ portada }: { portada: EntradaPortada }) {
  return (
    <Seccion tono="oscuro" espaciado="compacto">
      <Aparece>
        <figure className="rounded-lg border border-blanco/15 bg-azul-medio p-6 sm:p-8 lg:flex lg:items-center lg:gap-8">
          <span aria-hidden="true" className="font-display text-5xl leading-none text-acento-oscuro">
            “
          </span>
          <blockquote className="mt-3 flex-1 lg:mt-0">
            <p className="text-lg italic text-blanco/90 sm:text-xl">{portada.cita.texto}</p>
          </blockquote>
          <figcaption className="mt-4 text-sm lg:mt-0 lg:shrink-0 lg:text-right">
            <span className="block font-semibold text-blanco">{portada.cita.autor}</span>
            <span className="block text-blanco/70">{portada.cita.cargo}</span>
          </figcaption>
        </figure>
      </Aparece>
    </Seccion>
  );
}

/**
 * Documentos publicados, hasta cuatro. Leen de la base: si hay menos, se
 * muestran los que haya y no se rellena con marcadores.
 */
export function DocumentosPortal({ documentos }: { documentos: DocumentoConVersion[] }) {
  const visibles = documentos.slice(0, 4);

  return (
    <Seccion tituloId="titulo-documentos-portal">
      <Aparece>
        <SeccionTitulo id="titulo-documentos-portal" bajada="Formatos vigentes para descargar. La radicación es presencial.">
          Documentos
        </SeccionTitulo>
      </Aparece>
      {visibles.length === 0 ? (
        <p className="mt-8 text-texto-sec">Todavía no hay documentos publicados. Aparecerán aquí en cuanto el club los suba.</p>
      ) : (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {visibles.map((documento, i) => {
            const version = documento.version_vigente;
            return (
              <Aparece key={documento.id} indice={i + 1} como="li">
                <ItemDescarga
                  titulo={documento.titulo}
                  descripcion={documento.descripcion}
                  meta={
                    version
                      ? [`Versión ${version.version}`, `Publicado el ${formatearFecha(version.publicado_en)}`]
                      : []
                  }
                  href={version ? urlPublicaStorage(BUCKET_DOCUMENTOS, version.storage_path) : undefined}
                  nombreArchivo={version?.nombre_archivo}
                  className="h-full"
                />
              </Aparece>
            );
          })}
        </ul>
      )}
    </Seccion>
  );
}

/** Sede y canales de atención: imagen en lugar del mapa y lista de canales. */
export function SedePortal({ portada }: { portada: EntradaPortada }) {
  return (
    <Seccion tono="claro" tituloId="titulo-sede">
      <Aparece>
        <SeccionTitulo id="titulo-sede" bajada={portada.sedeBajada}>
          Sede y atención
        </SeccionTitulo>
      </Aparece>
      <div className="mt-8 grid gap-5 lg:grid-cols-[3fr_2fr]">
        <Aparece indice={1}>
          <Card className="h-full overflow-hidden">
            <div className="relative aspect-[16/9] bg-gris-frio">
              <Image
                src={resolverImagenSitio(portada.sede.imagen) ?? "/imagenes/sede.jpg"}
                alt={portada.sede.imagenAlt}
                fill
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="object-cover"
              />
            </div>
            <CardCuerpo>
              <h3 className="text-xl leading-tight">{portada.sede.nombre}</h3>
              <p className="mt-2 text-texto-sec">{portada.sede.descripcion}</p>
            </CardCuerpo>
          </Card>
        </Aparece>
        <Aparece indice={2}>
          <Card className="h-full">
            <CardCuerpo>
              <h3 className="text-xl leading-tight">Canales de atención</h3>
              <dl className="mt-4 flex flex-col divide-y divide-gris-borde">
                {portada.sede.canales.map((canal) => (
                  <div key={canal.id} className="py-3">
                    <dt className="text-xs font-bold uppercase tracking-wide text-texto-sec">{canal.titulo}</dt>
                    <dd className="mt-1 text-azul-profundo">{canal.texto}</dd>
                  </div>
                ))}
              </dl>
            </CardCuerpo>
          </Card>
        </Aparece>
      </div>
    </Seccion>
  );
}
