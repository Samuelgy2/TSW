import { Contenedor, Skeleton, SkeletonFilas, SkeletonHero } from "@/components/ui";

/** Portada y páginas sin `loading.tsx` propio (legales, laboratorio). */
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
