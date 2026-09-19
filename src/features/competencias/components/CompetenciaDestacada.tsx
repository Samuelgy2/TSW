import Image from "next/image";

import { Badge, Card, CardCuerpo } from "@/components/ui";
import { urlPublicaStorage } from "@/lib/supabase/storage";
import { formatearFecha } from "@/lib/utils";
import { BUCKET_COMPETENCIAS, type CompetenciaConResultados } from "../types";

/**
 * Competencia destacada: foto grande y ficha con fecha y los primeros puestos.
 * Server Component. Sin `imagen_path` va un marcador; la foto real se carga
 * desde el panel al bucket `competencias`.
 */
export function CompetenciaDestacada({ competencia }: { competencia: CompetenciaConResultados }) {
  const foto = competencia.imagen_path
    ? urlPublicaStorage(BUCKET_COMPETENCIAS, competencia.imagen_path)
    : "/imagenes/competencia.jpg";
  const podio = competencia.resultados.slice(0, 3);

  return (
    <Card className="overflow-hidden">
      <div className="grid lg:grid-cols-[3fr_2fr]">
        <div className="relative aspect-video bg-gris-frio lg:aspect-auto lg:min-h-[22rem]">
          <Image
            src={foto}
            alt={competencia.imagen_path ? `Foto de ${competencia.titulo}` : `[Foto de ${competencia.titulo}]`}
            fill
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-cover"
          />
        </div>

        <CardCuerpo className="flex flex-col p-6 lg:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tono="oscuro">Destacada</Badge>
            <Badge tono="acento">{formatearFecha(competencia.fecha)}</Badge>
          </div>
          <h3 className="mt-4 text-2xl sm:text-3xl">{competencia.titulo}</h3>
          {competencia.cuerpo && <p className="mt-3 text-texto-sec">{competencia.cuerpo}</p>}

          <div className="mt-6">
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-texto-sec">Podio</h4>
            {podio.length === 0 ? (
              <p className="mt-2 text-texto-sec">Resultados pendientes de publicar.</p>
            ) : (
              <ol className="mt-3 flex flex-col gap-2">
                {podio.map((resultado) => (
                  <li key={resultado.id} className="flex items-baseline gap-3 border-b border-gris-borde pb-2">
                    <span className="w-8 shrink-0 font-display text-2xl leading-none text-rojo">
                      {resultado.puesto}
                    </span>
                    <span className="font-semibold text-azul-profundo">{resultado.rider}</span>
                    <span className="ml-auto text-sm text-texto-sec">{resultado.categoria}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </CardCuerpo>
      </div>
    </Card>
  );
}
