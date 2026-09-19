"use client";

import Image from "next/image";
import { useState } from "react";

import { motion, useMovimientoReducido } from "@/lib/animaciones";
import { Badge, Boton, Card, CardCuerpo, EstadoVacio, Tabs } from "@/components/ui";
import type { Nivel } from "../types";

/**
 * Pestañas por nivel que cambian la ficha completa. Cliente por el estado de
 * la pestaña; los niveles llegan ya leídos desde el servidor. En móvil las
 * pestañas se desplazan en horizontal: es el comportamiento de `Tabs`.
 */
export function FichaNiveles({ niveles }: { niveles: Nivel[] }) {
  const reducido = useMovimientoReducido();
  const [activoId, setActivoId] = useState(niveles[0]?.id ?? "");
  const indice = Math.max(
    0,
    niveles.findIndex((n) => n.id === activoId),
  );
  const nivel = niveles[indice];

  if (!nivel) {
    return (
      <EstadoVacio
        titulo="Los niveles se publicarán pronto"
        texto="Cuando el club cargue sus semilleros y niveles de formación, aparecerán aquí con edades, horarios y criterios de promoción."
        accion={
          <Boton href="/matriculas" variante="secundario">
            Ver documentos de matrícula
          </Boton>
        }
      />
    );
  }

  return (
    <Tabs
      etiqueta="Niveles de formación"
      opciones={niveles.map((n) => ({ valor: n.id, etiqueta: n.nombre }))}
      valor={nivel.id}
      alCambiar={setActivoId}
    >
      <motion.div
        key={nivel.id}
        initial={reducido ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <div className="grid gap-0 lg:grid-cols-[minmax(0,26rem)_1fr]">
            <div className="relative aspect-4/3 overflow-hidden rounded-t-lg bg-gris-frio lg:aspect-auto lg:min-h-full lg:rounded-l-lg lg:rounded-tr-none">
              {/* Marcador: las fotos reales de cada nivel se cargan con el mismo nombre. */}
              <Image
                src={`/imagenes/nivel-${(indice % 4) + 1}.jpg`}
                alt={`[Describir la foto del nivel ${nivel.nombre}]`}
                fill
                sizes="(min-width: 1024px) 26rem, 100vw"
                className="object-cover"
              />
            </div>

            <CardCuerpo className="p-6 lg:p-8">
              <Badge tono="acento">Nivel {nivel.orden}</Badge>
              <h3 className="mt-3 text-2xl sm:text-3xl">{nivel.nombre}</h3>

              {nivel.descripcion && <p className="mt-4 text-texto-sec">{nivel.descripcion}</p>}

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.15em] text-texto-sec">Edades</dt>
                  <dd className="mt-1 font-semibold text-azul-profundo">
                    {nivel.rango_edad ?? "[Rango de edad pendiente]"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.15em] text-texto-sec">Horario</dt>
                  <dd className="mt-1 font-semibold text-azul-profundo">
                    {nivel.horario ?? "[Horario pendiente]"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-bold uppercase tracking-[0.15em] text-texto-sec">
                    Para pasar al siguiente nivel
                  </dt>
                  <dd className="mt-1 text-azul-profundo">
                    {nivel.criterio_promocion ?? "[Criterio de promoción pendiente]"}
                  </dd>
                </div>
              </dl>

              <Boton href="/matriculas" className="mt-8">
                Documentos de matrícula
              </Boton>
            </CardCuerpo>
          </div>
        </Card>
      </motion.div>
    </Tabs>
  );
}
