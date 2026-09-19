"use client";

import Image from "next/image";
import { useId, useState, type KeyboardEvent } from "react";

import { Aparece, IndicadorActivo, motion, useMovimientoReducido } from "@/lib/animaciones";
import { Badge, Boton } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Nivel } from "../types";

/**
 * Lista de niveles a la izquierda, detalle a la derecha.
 *
 * Es el patrón de pestañas con orientación vertical: `tablist`, foco itinerante
 * con flechas y un solo panel visible. Las tarjetas son `<button>`, no divs con
 * onClick, así que funcionan con teclado sin añadir nada.
 */
export function SelectorNiveles({ niveles }: { niveles: Nivel[] }) {
  const base = useId();
  const [activo, setActivo] = useState(0);
  const reducido = useMovimientoReducido();

  if (niveles.length === 0) {
    return (
      <section aria-labelledby="titulo-niveles" className="contenedor py-16 lg:py-20">
        <h2 id="titulo-niveles" className="text-3xl sm:text-4xl">
          Semilleros y niveles
        </h2>
        <p className="mt-4 text-texto-sec">
          Los niveles de formación se publicarán aquí en cuanto se carguen.
        </p>
      </section>
    );
  }

  const nivel = niveles[activo] as Nivel;

  function alTeclear(evento: KeyboardEvent<HTMLDivElement>) {
    let siguiente = activo;
    if (evento.key === "ArrowDown" || evento.key === "ArrowRight") siguiente = (activo + 1) % niveles.length;
    else if (evento.key === "ArrowUp" || evento.key === "ArrowLeft") siguiente = (activo - 1 + niveles.length) % niveles.length;
    else if (evento.key === "Home") siguiente = 0;
    else if (evento.key === "End") siguiente = niveles.length - 1;
    else return;

    evento.preventDefault();
    setActivo(siguiente);
    document.getElementById(`${base}-${siguiente}`)?.focus();
  }

  return (
    <section aria-labelledby="titulo-niveles" className="contenedor py-16 lg:py-20">
      <Aparece>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="titulo-niveles" className="text-3xl sm:text-4xl">
              Semilleros y niveles
            </h2>
            <p className="mt-2 max-w-2xl text-texto-sec">
              La ruta de formación del club, del primer contacto con la bicicleta a la competencia.
            </p>
          </div>
          <Boton href="/semilleros" variante="fantasma">
            Ver el detalle completo
          </Boton>
        </div>
      </Aparece>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <div
          role="tablist"
          aria-label="Niveles de formación"
          aria-orientation="vertical"
          onKeyDown={alTeclear}
          className="flex flex-col gap-2"
        >
          {niveles.map((item, i) => {
            const seleccionado = i === activo;
            return (
              <button
                key={item.id}
                id={`${base}-${i}`}
                role="tab"
                type="button"
                aria-selected={seleccionado}
                aria-controls={`${base}-panel`}
                tabIndex={seleccionado ? 0 : -1}
                onClick={() => setActivo(i)}
                className={cn(
                  "relative min-h-[44px] overflow-hidden rounded-lg border-2 p-4 text-left transition-colors",
                  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo",
                  seleccionado
                    ? "border-azul-profundo bg-azul-profundo text-blanco"
                    : "border-gris-borde bg-blanco hover:border-azul-medio",
                )}
              >
                <span className="flex items-baseline gap-3">
                  <span
                    className={cn(
                      "font-display text-2xl leading-none",
                      seleccionado ? "text-rojo" : "text-texto-sec",
                    )}
                  >
                    {String(item.orden).padStart(2, "0")}
                  </span>
                  <span className="font-semibold">{item.nombre}</span>
                </span>
                {item.rango_edad && (
                  <span
                    className={cn(
                      "mt-1 block text-sm",
                      seleccionado ? "text-blanco/70" : "text-texto-sec",
                    )}
                  >
                    {item.rango_edad}
                  </span>
                )}
                {seleccionado && <IndicadorActivo id={`${base}-indicador`} className="h-full w-[3px] inset-y-0 left-0 right-auto bottom-auto" />}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`${base}-panel`}
          aria-labelledby={`${base}-${activo}`}
          tabIndex={0}
          className="focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
        >
          <motion.div
            key={nivel.id}
            initial={reducido ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid gap-6 rounded-lg border border-gris-borde bg-blanco p-6 sm:grid-cols-2"
          >
            <div className="relative aspect-4/3 overflow-hidden rounded-md bg-gris-frio">
              <Image
                src={`/imagenes/nivel-${(activo % 4) + 1}.jpg`}
                alt={`[Describir la foto del nivel ${nivel.nombre}]`}
                fill
                sizes="(min-width: 640px) 24rem, 100vw"
                className="object-cover"
              />
            </div>

            <div>
              <Badge tono="acento">Nivel {nivel.orden}</Badge>
              <h3 className="mt-3 text-2xl">{nivel.nombre}</h3>

              {nivel.descripcion && <p className="mt-3 text-texto-sec">{nivel.descripcion}</p>}

              <dl className="mt-5 grid gap-3 text-sm">
                {nivel.rango_edad && (
                  <div>
                    <dt className="font-semibold text-azul-profundo">Edades</dt>
                    <dd className="text-texto-sec">{nivel.rango_edad}</dd>
                  </div>
                )}
                {nivel.horario && (
                  <div>
                    <dt className="font-semibold text-azul-profundo">Horario</dt>
                    <dd className="text-texto-sec">{nivel.horario}</dd>
                  </div>
                )}
                {nivel.criterio_promocion && (
                  <div>
                    <dt className="font-semibold text-azul-profundo">Para pasar al siguiente nivel</dt>
                    <dd className="text-texto-sec">{nivel.criterio_promocion}</dd>
                  </div>
                )}
              </dl>

              <Boton href="/matriculas" className="mt-6">
                Documentos de matrícula
              </Boton>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
