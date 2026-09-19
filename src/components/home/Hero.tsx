import { getImageProps } from "next/image";
import { preload } from "react-dom";

import { Boton, Carrusel } from "@/components/ui";

type Diapositiva = {
  id: string;
  /** Etiqueta corta sobre el titular y nombre del indicador. */
  nombre: string;
  titulo: string;
  texto: string;
  accion: { etiqueta: string; href: string };
  secundaria?: { etiqueta: string; href: string };
  /** Foto horizontal para tablet y escritorio (1920×1080). */
  imagen: string;
  /** Recorte vertical para celular (900×1200): la pista horizontal no sirve en vertical. */
  imagenMovil: string;
  alt: string;
};

/**
 * Las fotos son marcadores generados. Se reemplazan en /public/imagenes/
 * conservando los nombres y los dos recortes, y el texto alternativo debe
 * describir la foto real.
 */
const DIAPOSITIVAS: Diapositiva[] = [
  {
    id: "escuela",
    nombre: "La escuela",
    titulo: "Escuela de BMX",
    texto: "Formación desde la iniciación hasta la competencia.",
    accion: { etiqueta: "Ver matrículas", href: "/matriculas" },
    secundaria: { etiqueta: "Conocer los semilleros", href: "/semilleros" },
    imagen: "/imagenes/prueba 1.jpeg",
    imagenMovil: "/imagenes/hero-1-movil.jpg",
    alt: "[Describir la foto: deportistas del club en la pista de BMX]",
  },
  {
    id: "semilleros",
    nombre: "Formación",
    titulo: "Semilleros y niveles",
    texto: "Una ruta clara, con criterios de promoción definidos.",
    accion: { etiqueta: "Ver los niveles", href: "/semilleros" },
    imagen: "/imagenes/prueba2.jpeg",
    imagenMovil: "/imagenes/hero-2-movil.jpg",
    alt: "[Describir la foto: entrenamiento de los semilleros]",
  },
  {
    id: "competencias",
    nombre: "Resultados",
    titulo: "Competencias",
    texto: "Calendario y resultados de nuestros riders.",
    accion: { etiqueta: "Ver resultados", href: "/competencias" },
    imagen: "/imagenes/hero-3.jpg",
    imagenMovil: "/imagenes/hero-3-movil.jpg",
    alt: "[Describir la foto: podio de una competencia]",
  },
];

/** Punto de quiebre `sm` de Tailwind: por debajo va el recorte vertical. */
const MEDIA_MOVIL = "(max-width: 639px)";
const MEDIA_ESCRITORIO = "(min-width: 640px)";

/**
 * Portada: carrusel a sangre. Server Component; el estado vive en Carrusel.
 * El titular de la primera diapositiva es el h1 de la página; los demás son h2.
 */
export function Hero() {
  return (
    <Carrusel
      etiqueta="Presentación de la escuela"
      intervaloMs={6000}
      className="bg-azul-profundo text-blanco"
      claseDiapositiva="flex min-h-[560px] items-end sm:min-h-[620px] lg:min-h-[680px]"
      diapositivas={DIAPOSITIVAS.map((diapositiva, i) => ({
        id: diapositiva.id,
        nombre: diapositiva.nombre,
        contenido: <Diapositiva diapositiva={diapositiva} primera={i === 0} />,
      }))}
    />
  );
}

function Diapositiva({ diapositiva, primera }: { diapositiva: Diapositiva; primera: boolean }) {
  const Titulo = primera ? "h1" : "h2";

  return (
    <>
      <FotoHero diapositiva={diapositiva} prioridad={primera} />

      {/* Capa de contraste. En móvil la foto ocupa más y el texto se pierde
          sin ella; abajo, donde va el texto, el azul es sólido. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-t from-azul-profundo via-azul-profundo/75 to-azul-profundo/25"
      />

      {/* pb deja sitio a los indicadores, que viven en el borde inferior. */}
      <div className="contenedor relative pb-20 pt-24 sm:pb-24 lg:pb-28">
        <div className="max-w-2xl">
          <p className="mb-3 inline-block bg-rojo px-3 py-1 text-xs font-bold uppercase tracking-[0.2em]">
            {diapositiva.nombre}
          </p>
          <Titulo className="titulo-hero">{diapositiva.titulo}</Titulo>
          <p className="mt-4 max-w-xl text-lg text-blanco/85 sm:text-xl">{diapositiva.texto}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Boton href={diapositiva.accion.href} tamano="lg">
              {diapositiva.accion.etiqueta}
            </Boton>
            {diapositiva.secundaria && (
              <Boton href={diapositiva.secundaria.href} tamano="lg" variante="secundario" fondo="oscuro">
                {diapositiva.secundaria.etiqueta}
              </Boton>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Foto a sangre con art direction: `<picture>` sirve el recorte vertical en
 * celular y el horizontal desde `sm`. Ambas fuentes pasan por el optimizador
 * de next/image vía getImageProps.
 *
 * La primera foto es el LCP de la portada: carga ansiosa, prioridad alta y
 * precarga de la fuente que corresponda al ancho. Las demás, perezosas.
 * No hay layout shift: la diapositiva tiene alto mínimo fijo y la foto es
 * absoluta dentro de ella.
 */
function FotoHero({ diapositiva, prioridad }: { diapositiva: Diapositiva; prioridad: boolean }) {
  // `priority` solo quita el lazy; fetchPriority hay que pedirlo aparte.
  const comunes = {
    alt: diapositiva.alt,
    sizes: "100vw",
    quality: 75,
    priority: prioridad,
    fetchPriority: prioridad ? ("high" as const) : undefined,
  };

  const {
    props: { srcSet: srcSetEscritorio },
  } = getImageProps({ ...comunes, src: diapositiva.imagen, width: 1920, height: 1080 });

  const {
    props: { srcSet: srcSetMovil, ...propsImg },
  } = getImageProps({ ...comunes, src: diapositiva.imagenMovil, width: 900, height: 1200 });

  if (prioridad && srcSetMovil && srcSetEscritorio) {
    preload(propsImg.src, {
      as: "image",
      imageSrcSet: srcSetMovil,
      imageSizes: "100vw",
      media: MEDIA_MOVIL,
      fetchPriority: "high",
    });
    preload(diapositiva.imagen, {
      as: "image",
      imageSrcSet: srcSetEscritorio,
      imageSizes: "100vw",
      media: MEDIA_ESCRITORIO,
      fetchPriority: "high",
    });
  }

  return (
    <picture>
      <source media={MEDIA_ESCRITORIO} srcSet={srcSetEscritorio} sizes="100vw" />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt viene en propsImg */}
      <img
        {...propsImg}
        srcSet={srcSetMovil}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </picture>
  );
}
