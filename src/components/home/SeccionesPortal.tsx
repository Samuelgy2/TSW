import Image from "next/image";
import Link from "next/link";

import { Aparece } from "@/lib/animaciones";
import { Card, CardCuerpo, CuentaAscendente, Indicador, ItemDescarga, LogoClub, Seccion, SeccionTitulo } from "@/components/ui";
import type { Club } from "@/features/clubes/types";
import { BUCKET_DOCUMENTOS, type DocumentoConVersion } from "@/features/matriculas/types";
import { resolverImagenSitio } from "@/features/sitio/imagenes";
import type { EntradaPortada } from "@/features/sitio/schemas";
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
  // Una cifra sin dato no se pinta: ni número inventado ni marcador a la vista.
  const cifras = portada.cifras.filter((c) => c.valor !== null);
  if (cifras.length === 0) return null;

  return (
    <Seccion tono="oscuro" tituloId="titulo-cifras" espaciado="compacto" className="border-t border-blanco/10">
      <h2 id="titulo-cifras" className="sr-only">
        Cifras de la corporación
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cifras.map((cifra, i) => (
          <Aparece key={`${i}-${cifra.etiqueta}`} indice={i} como="li">
            <Indicador
              variante="cifra"
              oscuro
              etiqueta={cifra.etiqueta}
              valor={
                <>
                  <CuentaAscendente hasta={cifra.valor!} />
                  {cifra.sufijo}
                </>
              }
              detalle={cifra.detalle}
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

/**
 * «Nuestros clubes y programa»: una tarjeta por club o programa activo, leída
 * de la tabla `club` (etiqueta, descripción, viñetas y logo). Reemplaza a la
 * sección «Nuestros deportes», que leía de `deporte`. La bajada sigue siendo
 * `portada.deportesBajada` (la clave no se renombra para no mover datos).
 * Sin clubes no se pinta la sección.
 */
export function ClubesPortal({ clubes, portada }: { clubes: Club[]; portada: EntradaPortada }) {
  if (clubes.length === 0) return null;
  // Con dos tarjetas, dos columnas: una cuadrícula de tres con un hueco se ve rota.
  const columnas = clubes.length >= 3 ? "md:grid-cols-3" : "sm:grid-cols-2";

  return (
    <Seccion tituloId="titulo-clubes">
      <Aparece>
        <SeccionTitulo id="titulo-clubes" bajada={portada.deportesBajada || undefined}>
          Nuestros clubes y programa
        </SeccionTitulo>
      </Aparece>
      <ul className={cn("mt-8 grid gap-5", columnas)}>
        {clubes.map((club, i) => {
          // `?? []`: la página puede desplegarse un instante antes que la migración
          // 160000; sin la columna, `club.vinetas` llega undefined y no debe romper la portada.
          const vinetas = club.vinetas ?? [];
          return (
          <Aparece key={club.id} indice={i + 1} como="li">
            <Card className="h-full">
              <CardCuerpo className="flex h-full flex-col">
                <div className="flex items-center gap-4">
                  <LogoClub
                    nombre={club.nombre}
                    logoUrl={resolverImagenSitio(club.logo_path)}
                    color={club.color_identidad}
                    tamano="md"
                  />
                  <div className="min-w-0">
                    <h3 className="text-xl leading-tight sm:text-2xl">{club.nombre}</h3>
                    {club.etiqueta && (
                      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-acento-oscuro">{club.etiqueta}</p>
                    )}
                  </div>
                </div>
                {club.descripcion && <p className="mt-4 text-sm text-texto-sec">{club.descripcion}</p>}
                {vinetas.length > 0 && (
                  <ul className="mt-4 flex flex-1 flex-col gap-1.5 text-sm font-semibold text-azul-profundo">
                    {vinetas.map((vineta) => (
                      <li key={vineta} className="flex items-start gap-2">
                        <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-acento-oscuro" />
                        <span>{vineta}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href={`/semilleros/${club.slug}`}
                  className="mt-4 inline-flex min-h-[44px] items-center self-start font-semibold text-acento-oscuro underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
                >
                  {club.tipo === "programa" ? "Ver el programa" : "Ver niveles"}
                  <span className="sr-only">: {club.nombre}</span>
                  <span aria-hidden="true" className="ml-1">
                    →
                  </span>
                </Link>
              </CardCuerpo>
            </Card>
          </Aparece>
          );
        })}
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
