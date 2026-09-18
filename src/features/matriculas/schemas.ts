import { z } from "zod";

export const esquemaDocumento = z.object({
  titulo: z.string().min(3, "El título es obligatorio").max(160),
  descripcion: z.string().max(500, "Máximo 500 caracteres").nullable().optional(),
  orden: z.number().int().min(0).default(0),
  activo: z.boolean().default(true),
});

export type EntradaDocumento = z.infer<typeof esquemaDocumento>;

/** Tope del bucket documentos-matricula. */
const MAX_PDF_BYTES = 10 * 1024 * 1024;

/**
 * Publicación de una versión nueva. El orden de la operación importa:
 *   1. `siguiente_version_documento()` devuelve el número
 *   2. se sube el PDF a documentos/{documento_id}/v{version}/{nombre}
 *   3. se llama la RPC `publicar_documento_version`
 * La versión va dentro de la ruta para que un archivo publicado no se pueda
 * sobrescribir en Storage.
 */
export const esquemaNuevaVersion = z
  .object({
    documento_id: z.string().uuid("Documento inválido"),
    version: z.number().int().positive("La versión empieza en 1"),
    storage_path: z.string().min(1, "Falta la ruta del archivo"),
    nombre_archivo: z
      .string()
      .min(1, "Falta el nombre del archivo")
      .regex(/\.pdf$/i, "El documento debe ser un PDF"),
    tamano_bytes: z
      .number()
      .int()
      .positive("El archivo está vacío")
      .max(MAX_PDF_BYTES, "El PDF no puede pesar más de 10 MB"),
  })
  .refine(
    (datos) =>
      datos.storage_path ===
      `documentos/${datos.documento_id}/v${datos.version}/${datos.nombre_archivo}`,
    {
      message:
        "La ruta debe ser documentos/{documento_id}/v{version}/{nombre_archivo}",
      path: ["storage_path"],
    },
  );

export type EntradaNuevaVersion = z.infer<typeof esquemaNuevaVersion>;
