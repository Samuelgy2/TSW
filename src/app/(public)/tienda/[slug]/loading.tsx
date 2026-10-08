import { Contenedor, Skeleton, SkeletonTexto } from "@/components/ui";

export default function CargandoProducto() {
  return (
    <Contenedor className="py-12 sm:py-16 lg:py-20">
      <div className="grid gap-8 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-11 w-3/4" />
          <Skeleton className="h-8 w-32" />
          <SkeletonTexto lineas={4} />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </Contenedor>
  );
}
