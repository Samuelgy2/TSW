import { Contenedor, Skeleton, SkeletonFilas, SkeletonHero } from "@/components/ui";

export default function CargandoCompetencias() {
  return (
    <>
      <SkeletonHero />
      <Contenedor className="py-12 sm:py-16 lg:py-20">
        <Skeleton className="aspect-video w-full lg:aspect-[3/1]" />
        <SkeletonFilas filas={3} className="mt-10" />
      </Contenedor>
    </>
  );
}
