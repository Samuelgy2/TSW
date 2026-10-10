import { Contenedor, Skeleton, SkeletonFilas, SkeletonHero } from "@/components/ui";

export default function CargandoSemilleros() {
  return (
    <>
      <SkeletonHero />
      <Contenedor className="py-12 sm:py-16 lg:py-20">
        <Skeleton className="h-11 w-full max-w-xl" />
        <SkeletonFilas filas={2} className="mt-8" />
      </Contenedor>
    </>
  );
}
