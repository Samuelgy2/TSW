import type { Enums, Tables } from "@/lib/supabase/database.types";

export type Producto = Tables<"producto">;
export type Variante = Tables<"variante">;
export type CategoriaProducto = Enums<"categoria_producto">;

/** Producto con sus variantes, tal como se muestra en la tienda. */
export type ProductoConVariantes = Producto & {
  variantes: Variante[];
};

/** Unidades que se pueden vender ahora mismo. */
export function disponible(variante: Variante): number {
  return variante.stock - variante.stock_reservado;
}
