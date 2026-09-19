import { Contenedor, SkeletonFilas, SkeletonHero } from "@/components/ui";

export default function CargandoMatriculas() {
  return (
    <>
      <SkeletonHero oscuro />
      <Contenedor className="py-12 sm:py-16 lg:py-20">
        <SkeletonFilas filas={4} />
      </Contenedor>
    </>
  );
}
