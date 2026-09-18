import { z } from "zod";

export const esquemaNivel = z.object({
  nombre: z.string().min(3, "El nombre es obligatorio").max(120),
  // Único en la base: reordenar exige liberar el número antes de reutilizarlo.
  orden: z.number().int().min(1, "El orden empieza en 1"),
  rango_edad: z.string().max(60).nullable().optional(),
  horario: z.string().max(300).nullable().optional(),
  descripcion: z.string().max(4000).nullable().optional(),
  criterio_promocion: z.string().max(1000).nullable().optional(),
  activo: z.boolean().default(true),
});

export type EntradaNivel = z.infer<typeof esquemaNivel>;
