import { cn } from "@/lib/utils";

/**
 * Bloque de carga. La animación de pulso la apaga el bloque de
 * prefers-reduced-motion de globals.css, así que aquí no hay condicionales.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gris-borde/70", className)}
      aria-hidden="true"
    />
  );
}

/** Varias líneas de texto simuladas. */
export function SkeletonTexto({ lineas = 3, className }: { lineas?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lineas }).map((_, i) => (
        <Skeleton key={i} className={cn("h-4", i === lineas - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/** Hueco de tarjeta de producto, para Suspense del catálogo. */
export function SkeletonTarjeta({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-gris-borde", className)}>
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}
