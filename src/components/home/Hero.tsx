"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { AnimatePresence, motion, useMovimientoReducido } from "@/lib/animaciones";
import { Boton } from "@/components/ui";
import { cn } from "@/lib/utils";

type Diapositiva = {
  imagen: string;
  alt: string;
  titulo: string;
  texto: string;
  accion: { etiqueta: string; href: string };
  secundaria?: { etiqueta: string; href: string };
};

/**
 * Las fotos son marcadores generados. Se reemplazan en /public/imagenes/
 * conservando los nombres, y el texto alternativo debe describir la foto real.
 */
const DIAPOSITIVAS: Diapositiva[] = [
  {
    imagen: "/imagenes/hero-1.jpg",
    alt: "[Describir la foto: deportistas del club en la pista de BMX]",
    titulo: "Escuela de BMX",
    texto: "Formación desde la iniciación hasta la competencia.",
    accion: { etiqueta: "Ver matrículas", href: "/matriculas" },
    secundaria: { etiqueta: "Conocer los semilleros", href: "/semilleros" },
  },
  {
    imagen: "/imagenes/hero-2.jpg",
    alt: "[Describir la foto: entrenamiento de los semilleros]",
    titulo: "Semilleros y niveles",
    texto: "Una ruta clara, con criterios de promoción definidos.",
    accion: { etiqueta: "Ver los niveles", href: "/semilleros" },
  },
  {
    imagen: "/imagenes/hero-3.jpg",
    alt: "[Describir la foto: podio de una competencia]",
    titulo: "Competencias",
    texto: "Calendario y resultados de nuestros riders.",
    accion: { etiqueta: "Ver resultados", href: "/competencias" },
  },
];

const INTERVALO_MS = 7000;

export function Hero() {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const reducido = useMovimientoReducido();

  const ir = useCallback((siguiente: number) => {
    setIndice(((siguiente % DIAPOSITIVAS.length) + DIAPOSITIVAS.length) % DIAPOSITIVAS.length);
  }, []);

  // El avance automático se apaga con movimiento reducido y mientras el
  // visitante tiene el cursor o el foco dentro del carrusel.
  useEffect(() => {
    if (reducido || pausado) return;
    const temporizador = window.setInterval(() => {
      setIndice((actual) => (actual + 1) % DIAPOSITIVAS.length);
    }, INTERVALO_MS);
    return () => window.clearInterval(temporizador);
  }, [reducido, pausado]);

  const actual = DIAPOSITIVAS[indice] as Diapositiva;

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Presentación de la escuela"
      className="relative isolate flex min-h-[560px] items-end overflow-hidden bg-azul-profundo text-blanco sm:min-h-[620px] lg:min-h-[680px]"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
    >
      {/* Foto a sangre. La primera se precarga: es el LCP de la portada. */}
      {DIAPOSITIVAS.map((diapositiva, i) => (
        <Image
          key={diapositiva.imagen}
          src={diapositiva.imagen}
          alt={i === indice ? diapositiva.alt : ""}
          fill
          priority={i === 0}
          sizes="100vw"
          className={cn(
            "-z-10 object-cover transition-opacity duration-500",
            i === indice ? "opacity-100" : "opacity-0",
          )}
          aria-hidden={i === indice ? undefined : true}
        />
      ))}

      {/* Overlay azul: sin él, el texto blanco no alcanza el contraste AA. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-azul-profundo via-azul-profundo/80 to-azul-profundo/40"
      />

      <div className="contenedor pb-14 pt-24 sm:pb-16 lg:pb-20">
        <div aria-live="polite" aria-atomic="true" className="max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={indice}
              initial={reducido ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducido ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <p className="mb-3 inline-block bg-rojo px-3 py-1 text-xs font-bold uppercase tracking-[0.2em]">
                {`Diapositiva ${indice + 1} de ${DIAPOSITIVAS.length}`}
              </p>
              <h1 className="text-4xl leading-[1.05] sm:text-6xl lg:text-7xl">{actual.titulo}</h1>
              <p className="mt-4 max-w-xl text-lg text-blanco/85 sm:text-xl">{actual.texto}</p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Boton href={actual.accion.href} tamano="lg">
              {actual.accion.etiqueta}
            </Boton>
            {actual.secundaria && (
              <Boton
                href={actual.secundaria.href}
                tamano="lg"
                variante="secundario"
                className="border-blanco text-blanco hover:bg-blanco hover:text-azul-profundo"
              >
                {actual.secundaria.etiqueta}
              </Boton>
            )}
          </div>
        </div>

        {/* Indicadores: botones reales, no puntos decorativos. */}
        <div className="mt-10 flex items-center gap-3">
          {DIAPOSITIVAS.map((diapositiva, i) => (
            <button
              key={diapositiva.imagen}
              type="button"
              onClick={() => ir(i)}
              aria-current={i === indice ? "true" : undefined}
              className="group flex min-h-[44px] items-center focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "block h-1.5 rounded-full transition-all duration-300",
                  i === indice ? "w-12 bg-rojo" : "w-6 bg-blanco/40 group-hover:bg-blanco/70",
                )}
              />
              <span className="sr-only">
                Ir a la diapositiva {i + 1}: {diapositiva.titulo}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
