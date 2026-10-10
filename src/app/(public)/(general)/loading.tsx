import { Contenedor, Skeleton, SkeletonFilas, SkeletonHero } from "@/components/ui";

/**
 * Portada, laboratorio y legales. Viven en el grupo `(general)` y no en la raíz
 * de `(public)` para que este esqueleto no envuelva a las demás secciones: un
 * `loading.tsx` por encima de un layout lo deja dentro del Suspense, y el
 * `notFound()` de `/semilleros/<slug>` saldría con 200 (soft 404).
 */
export default function CargandoPublico() {
  return (
    <>
      <SkeletonHero oscuro />
      <Contenedor className="py-12 sm:py-16 lg:py-20">
        <Skeleton className="h-11 w-64" />
        <SkeletonFilas filas={3} className="mt-8" />
      </Contenedor>
    </>
  );
}
