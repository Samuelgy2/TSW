"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { AnimatePresence, motion, SUAVIZADO, useMovimientoReducido } from "@/lib/animaciones";
import { Badge, Boton, Carrusel } from "@/components/ui";
import { CARRUSEL_INTERVALO_MS, SITIO } from "@/config/sitio";
import type { SlideCarrusel } from "@/features/carrusel/types";
import { resolverImagenSitio } from "@/features/sitio/imagenes";
import type { EntradaDeportes, EntradaPortada } from "@/features/sitio/schemas";
import { cn } from "@/lib/utils";

/**
 * Portada de la corporación, fusionada con el carrusel editable (migración 21):
 * ya no son dos secciones apiladas, es una sola. La imagen del slide activo es
 * el fondo de TODO el hero (con degradado para el contraste del texto); título,
 * descripción y botón del slide reemplazan el texto fijo, con fundido
 * sincronizado al cambio de imagen. `Carrusel` sigue siendo la base de la
 * navegación —scroll-snap, flechas, indicadores, pausa, swipe, foco—, sin
 * reescribirla: solo se le añadió `alCambiarIndice` (Carrusel.tsx) para que
 * este componente sepa qué diapositiva está activa y le sincronice el texto.
 *
 * Elementos que NO vienen de `carrusel_slide` y se quedan fijos, superpuestos
 * sobre la imagen que cambia: el Badge (un solo campo editable,
 * `portada.etiquetaEntidad`), la tarjeta "Deportes de la
 * corporación" y la línea de aval ("Reconocimiento deportivo..."). Decisión
 * explícita de Samuel, no mía.
 *
 * Sin diapositivas activas: fondo azul profundo liso (el de siempre) y el
 * texto de fábrica (`SITIO.nombreLargo` / `portada.presentacion` / los dos
 * botones). Ni el layout ni el resto del hero cambian de forma según haya o
 * no slides ni según `prefers-reduced-motion` — lo único que varía son las
 * props de animación (regla de `lib/animaciones`).
 */
export function HeroPortal({
  deportes,
  portada,
  slides,
}: {
  deportes: EntradaDeportes;
  portada: EntradaPortada;
  slides: SlideCarrusel[];
}) {
  const reducido = useMovimientoReducido();
  const [indiceActivo, setIndiceActivo] = useState(0);
  // Foco en cualquier parte del hero (CTA, tarjeta de deportes): el slide no
  // debe rotar y desmontar el botón enfocado. Carrusel ya cubre su propio foco.
  const [focoEnHero, setFocoEnHero] = useState(false);

  const tieneSlides = slides.length > 0;
  const activo = tieneSlides ? (slides[indiceActivo] ?? slides[0]) : null;

  return (
    <div
      className="relative isolate min-h-[440px] overflow-hidden bg-azul-profundo text-blanco sm:min-h-[520px] lg:min-h-[600px]"
      // Foco de teclado, no de clic (mismo criterio que Carrusel).
      onFocusCapture={(evento) => setFocoEnHero((evento.target as HTMLElement).matches(":focus-visible"))}
      onBlurCapture={(evento) => {
        if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) setFocoEnHero(false);
      }}
    >
      {tieneSlides && (
        <>
          <div className="absolute inset-0">
            <Carrusel
              diapositivas={slides.map((slide, indice) => ({
                id: slide.id,
                nombre: slide.titulo,
                contenido: <ImagenFondoSlide slide={slide} prioridad={indice === 0} />,
              }))}
              etiqueta="Destacados de la corporación"
              intervaloMs={CARRUSEL_INTERVALO_MS}
              className="h-full"
              claseDiapositiva="h-full"
              sobreOscuro
              alCambiarIndice={setIndiceActivo}
              pausado={focoEnHero}
              zonasToque
              controles="arriba"
            />
          </div>
        </>
      )}

      {/* pointer-events-none: esta caja puede terminar solapando, sin verse,
          la barra de indicadores/flechas del carrusel (absoluta al hero
          entero, no a este grid) cuando el texto de un slide es corto y deja
          hueco debajo. Sin este corte, ese hueco transparente le robaría los
          clics al carrusel aunque no se note a simple vista. Se reactiva a
          mano en los dos hijos que sí tienen algo clicable. */}
      <div className={cn(
          "contenedor relative grid gap-8 py-12 pointer-events-none sm:py-16 lg:grid-cols-[3fr_2fr] lg:items-start lg:gap-12 lg:py-20",
          // Deja sitio arriba a los puntos y al botón de pausa del carrusel.
          tieneSlides && "pt-16 sm:pt-20",
        )}>
        <div>
          <Badge tono="solido">{portada.etiquetaEntidad}</Badge>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activo?.id ?? "estatico"}
              initial={reducido ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reducido ? undefined : { opacity: 0 }}
              transition={{ duration: reducido ? 0 : 0.35, ease: SUAVIZADO }}
            >
              <h1 className="titulo-hero mt-5">{activo ? activo.titulo : SITIO.nombreLargo}</h1>
              {(activo ? activo.descripcion : portada.presentacion) && (
                <p className="mt-4 max-w-xl text-lg text-blanco/85 sm:text-xl">
                  {activo ? activo.descripcion : portada.presentacion}
                </p>
              )}
              <div className="pointer-events-auto mt-8 flex flex-col gap-3 sm:flex-row">
                {activo ? (
                  activo.etiqueta_enlace &&
                  activo.destino_enlace && (
                    <Boton href={activo.destino_enlace} tamano="lg">
                      {activo.etiqueta_enlace}
                    </Boton>
                  )
                ) : (
                  <>
                    <Boton href="/matriculas" tamano="lg">
                      Ver matrículas
                    </Boton>
                    <Boton href="/semilleros" tamano="lg" variante="secundario" fondo="oscuro">
                      Conocer los niveles
                    </Boton>
                  </>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          <p className="mt-6 text-sm text-blanco/60">{portada.aval}</p>
        </div>

        <section
          aria-labelledby="titulo-hero-deportes"
          className="pointer-events-auto rounded-lg border border-blanco/15 bg-azul-medio p-5 sm:p-6"
        >
          <h2 id="titulo-hero-deportes" className="text-xs font-bold uppercase tracking-[0.2em] text-blanco/70">
            Deportes de la corporación
          </h2>
          <ul className="mt-4 flex flex-col divide-y divide-blanco/10">
            {deportes.map((deporte) => (
              <li key={deporte.id}>
                <Link
                  href={`/semilleros?deporte=${deporte.id}`}
                  className="group flex min-h-[44px] items-center justify-between gap-4 py-3 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
                >
                  <span className="min-w-0">
                    <span className="block font-display text-lg uppercase leading-tight">{deporte.nombre}</span>
                    <span className="mt-0.5 block text-sm text-blanco/70">{deporte.categoria}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 font-semibold text-blanco/85 transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function ImagenFondoSlide({ slide, prioridad }: { slide: SlideCarrusel; prioridad: boolean }) {
  const url = resolverImagenSitio(slide.imagen_path);
  if (!url) return null;
  return (
    <>
      <Image src={url} alt="" fill sizes="100vw" priority={prioridad} className="object-cover" />
      {/* Los degradados viven DENTRO de la diapositiva y no encima del carrusel:
          así los controles (puntos, pausa, flechas) quedan por encima y no
          bajo una capa casi opaca. El de abajo da AA al texto sobre cualquier
          foto; el de arriba, contraste a los controles. pointer-events-none
          para no robar clics a la pista. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-azul-profundo via-azul-profundo/70 to-azul-profundo/25" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-azul-profundo/70 to-transparent" />
    </>
  );
}
