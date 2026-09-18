import Image from "next/image";

import { Badge, CardEnlace, CardCuerpo } from "@/components/ui";
import { formatearPrecio } from "@/lib/utils";
import { disponible, type ProductoConVariantes } from "../types";
import { precioDesde } from "../queries";

const ETIQUETA_CATEGORIA: Record<ProductoConVariantes["categoria"], string> = {
  uniformes: "Uniformes",
  proteccion: "Protección",
  merchandising: "Merchandising",
};

/**
 * Tarjeta de catálogo. Server Component: no tiene estado ni eventos.
 *
 * NOTA: `producto` no tiene columna de imagen en el esquema —solo `competencia`
 * la tiene—, así que aquí va un marcador. Añadir `imagen_path` a `producto` es
 * una migración pendiente antes de publicar fotos reales del catálogo.
 */
export function TarjetaProducto({
  producto,
  prioridad = false,
}: {
  producto: ProductoConVariantes;
  prioridad?: boolean;
}) {
  const desde = precioDesde(producto);
  const unidades = producto.variantes.reduce((total, v) => total + (v.activo ? disponible(v) : 0), 0);
  const agotado = unidades <= 0;

  return (
    <CardEnlace href={`/tienda/${producto.slug}`} className="h-full overflow-hidden">
      <div className="relative aspect-square bg-gris-frio">
        <Image
          src="/imagenes/producto.jpg"
          alt={`[Foto de ${producto.nombre}]`}
          fill
          priority={prioridad}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
        {agotado && (
          <span className="absolute left-3 top-3">
            <Badge tono="oscuro">Agotado</Badge>
          </span>
        )}
      </div>

      <CardCuerpo className="flex h-full flex-col">
        <span className="text-xs font-bold uppercase tracking-[0.15em] text-texto-sec">
          {ETIQUETA_CATEGORIA[producto.categoria]}
        </span>
        <h3 className="mt-2 text-lg leading-snug">{producto.nombre}</h3>

        <p className="mt-3 font-display text-xl text-azul-profundo">
          {desde === null ? (
            <span className="text-base font-normal text-texto-sec">Precio pendiente</span>
          ) : (
            <>
              <span className="text-sm font-normal text-texto-sec">Desde </span>
              {formatearPrecio(desde)}
            </>
          )}
        </p>
      </CardCuerpo>
    </CardEnlace>
  );
}
