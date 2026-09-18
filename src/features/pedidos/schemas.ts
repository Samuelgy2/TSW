import { z } from "zod";

/** Lo que el comprador envía al iniciar el checkout. */
export const esquemaCheckout = z.object({
  comprador_nombre: z.string().min(3, "Escribe el nombre completo").max(120),
  comprador_email: z.string().email("Correo inválido"),
  // Colombia: 10 dígitos, con o sin indicativo +57.
  comprador_telefono: z
    .string()
    .regex(/^(\+?57)?[0-9]{10}$/, "Teléfono inválido (10 dígitos)"),
  notas: z.string().max(300).nullable().optional(),
  items: z
    .array(
      z.object({
        variante_id: z.string().uuid("Variante inválida"),
        cantidad: z.number().int().min(1, "Mínimo 1").max(50, "Máximo 50 por línea"),
      }),
    )
    .min(1, "El carrito está vacío"),
});

export type EntradaCheckout = z.infer<typeof esquemaCheckout>;

/**
 * El precio NO viaja en la petición. El servidor lo lee de `variante`, lo copia
 * a `pedido_item`, y el trigger de la base calcula `pedido.total_centavos`. Así
 * el cliente no puede manipular el monto que se firma para Wompi.
 */

/** Consulta pública de un pedido: referencia + correo del comprador. */
export const esquemaConsultaPedido = z.object({
  referencia: z.string().regex(/^TSW-[0-9]{4}-[0-9]{6}$/, "Referencia inválida"),
  correo: z.string().email("Correo inválido"),
});

export type EntradaConsultaPedido = z.infer<typeof esquemaConsultaPedido>;
