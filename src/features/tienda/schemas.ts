import { z } from "zod";

export const esquemaProducto = z.object({
  nombre: z.string().min(3, "El nombre es obligatorio").max(160),
  slug: z
    .string()
    .min(3, "El slug debe tener al menos 3 caracteres")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones"),
  categoria: z.enum(["uniformes", "proteccion", "merchandising"]),
  descripcion: z.string().max(2000, "Máximo 2000 caracteres").nullable().optional(),
  activo: z.boolean().default(true),
  orden: z.number().int().min(0).default(0),
});

export type EntradaProducto = z.infer<typeof esquemaProducto>;

export const esquemaVariante = z.object({
  producto_id: z.string().uuid("Producto inválido"),
  talla: z.string().min(1, "La talla es obligatoria").max(20),
  // Precio en centavos de COP: entero y mayor que cero, como exige el CHECK.
  precio_centavos: z
    .number()
    .int("El precio debe ser un entero en centavos")
    .positive("El precio debe ser mayor que cero"),
  stock: z.number().int().min(0, "El stock no puede ser negativo").default(0),
  sku: z.string().min(3).max(40).nullable().optional(),
  activo: z.boolean().default(true),
});

export type EntradaVariante = z.infer<typeof esquemaVariante>;

/**
 * `stock_reservado` no aparece a propósito: solo lo mueven reservar_stock,
 * liberar_reserva y consumir_reserva. Ningún formulario lo escribe.
 */
