import { z } from "zod";

export const esquemaCompetencia = z.object({
  titulo: z.string().min(3, "El título es obligatorio").max(160),
  slug: z
    .string()
    .min(3, "El slug debe tener al menos 3 caracteres")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones"),
  fecha: z.string().date("Fecha inválida"),
  cuerpo: z.string().max(8000, "Máximo 8000 caracteres").nullable().optional(),
  estado: z.enum(["borrador", "publicado", "archivado"]).default("borrador"),
  destacado: z.boolean().default(false),
  imagen_path: z.string().max(400).nullable().optional(),
  /**
   * Solo se publican fotos con autorización de uso de imagen firmada por el
   * acudiente: en las competencias hay menores de edad. El control es
   * documental, así que la casilla es obligatoria antes de subir material.
   */
  autorizacion_imagen_confirmada: z.literal(true, {
    errorMap: () => ({
      message:
        "Debes confirmar que existe autorización de uso de imagen firmada para las fotos",
    }),
  }),
});

export type EntradaCompetencia = z.infer<typeof esquemaCompetencia>;

export const esquemaResultado = z.object({
  competencia_id: z.string().uuid("Competencia inválida"),
  rider: z.string().min(3, "El nombre del rider es obligatorio").max(120),
  categoria: z.string().min(2, "La categoría es obligatoria").max(80),
  puesto: z.number().int().min(1, "El puesto empieza en 1"),
});

export type EntradaResultado = z.infer<typeof esquemaResultado>;
