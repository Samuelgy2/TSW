import { z } from "zod";

import { MAXIMO_PDF_BYTES } from "./constantes";

/**
 * Validaciones del lado del servidor para las escrituras del panel.
 * El cliente repite las reglas por comodidad, pero nunca se le confía la
 * validación: lo que llega a una Server Action se vuelve a parsear aquí.
 */

// --- Compartidas ------------------------------------------------------------


/** Solo texto plano: el cuerpo se muestra con funciones de escape, nunca como HTML. */
const TEXTO_SEGURO = (campo: string, maximo: number) =>
  z
    .string()
    .max(maximo, `${campo}: máximo ${maximo} caracteres.`)
    // Rechaza explícitamente etiquetas: el cuerpo nunca se interpreta como HTML.
    .refine((texto) => !/<[a-z!/]/i.test(texto), {
      message: "No se permite formato HTML en este campo.",
    });

const UUID = z.string().uuid("Identificador inválido.");

// --- Acceso (bloque A) ------------------------------------------------------

export const esquemaAcceso = z.object({
  correo: z.string().trim().email("Escribe un correo válido."),
  contrasena: z.string().min(8, "La contraseña tiene al menos 8 caracteres."),
  /** Ruta a la que volver tras entrar. Se valida en el servidor. */
  redirigir: z.string().optional(),
});

export type EntradaAcceso = z.infer<typeof esquemaAcceso>;

export const esquemaRecuperacion = z.object({
  correo: z.string().trim().email("Escribe un correo válido."),
});

export type EntradaRecuperacion = z.infer<typeof esquemaRecuperacion>;

export const esquemaNuevaContrasena = z
  .object({
    contrasena: z
      .string()
      .min(10, "Usa al menos 10 caracteres.")
      .max(72, "Máximo 72 caracteres."),
    confirmacion: z.string(),
  })
  .refine((datos) => datos.contrasena === datos.confirmacion, {
    path: ["confirmacion"],
    message: "Las contraseñas no coinciden.",
  });

export type EntradaNuevaContrasena = z.infer<typeof esquemaNuevaContrasena>;

// --- Documentos (bloque B) --------------------------------------------------

export const esquemaDocumento = z.object({
  id: UUID.optional(),
  titulo: z.string().trim().min(3, "El título es obligatorio.").max(160, "Máximo 160 caracteres."),
  descripcion: z
    .string()
    .trim()
    .max(500, "Máximo 500 caracteres.")
    .transform((texto) => (texto === "" ? null : texto))
    .optional(),
  activo: z.boolean().default(true),
  orden: z.number().int().min(0, "El orden no puede ser negativo.").default(0),
});

export type EntradaDocumento = z.infer<typeof esquemaDocumento>;

/**
 * Publicación de una versión. El archivo llega aparte (FormData); aquí va el
 * resultado de validarlo en el servidor: tamaño y MIME real por firma.
 */
export const esquemaPublicarVersion = z.object({
  documentoId: UUID,
  /** Número que devuelve siguiente_version_documento() antes de subir. */
  version: z.number().int().min(1),
  nombreArchivo: z.string().min(1).max(255),
  tamanoBytes: z
    .number()
    .int()
    .min(1, "El archivo está vacío.")
    .max(MAXIMO_PDF_BYTES, "El PDF supera el tope de 10 MB."),
  storagePath: z
    .string()
    .regex(/^documentos\/[0-9a-f-]{36}\/v\d+\/.+$/, "La ruta no cumple el formato versionado."),
});

export type EntradaPublicarVersion = z.infer<typeof esquemaPublicarVersion>;

// --- Competencias (bloque B) ------------------------------------------------

export const esquemaCompetencia = z.object({
  id: UUID.optional(),
  titulo: z.string().trim().min(3, "El título es obligatorio.").max(160, "Máximo 160 caracteres."),
  slug: z
    .string()
    .min(3, "El slug debe tener al menos 3 caracteres.")
    .max(160)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones."),
  fecha: z.string().date("Fecha inválida."),
  cuerpo: TEXTO_SEGURO("El cuerpo", 8000)
    .transform((texto) => (texto === "" ? null : texto))
    .optional(),
  imagenPath: z.string().max(400).nullish(),
  /** Confirmación de autorización de uso de imagen: condición para subir fotos. */
  autorizacionImagen: z.boolean().default(false),
});

export type EntradaCompetencia = z.infer<typeof esquemaCompetencia>;

/**
 * Publicar una competencia. Exige autorización de imagen si la competencia
 * tiene foto: con menores de edad el control es documental y se exige aquí,
 * no en la interfaz.
 */
export const esquemaPublicarCompetencia = z
  .object({
    id: UUID,
    autorizacionImagen: z.boolean().default(false),
    imagenPath: z.string().max(400).nullish(),
  })
  .refine((datos) => !datos.imagenPath || datos.autorizacionImagen, {
    message:
      "Para publicar una competencia con fotos debes confirmar la autorización de uso de imagen firmada por el acudiente.",
    path: ["autorizacionImagen"],
  });

export type EntradaPublicarCompetencia = z.infer<typeof esquemaPublicarCompetencia>;

export const esquemaResultado = z.object({
  competenciaId: UUID,
  rider: z.string().trim().min(3, "El nombre del rider es obligatorio.").max(120, "Máximo 120 caracteres."),
  categoria: z.string().trim().min(2, "La categoría es obligatoria.").max(80, "Máximo 80 caracteres."),
  puesto: z.number().int("El puesto debe ser un número entero.").min(1, "El puesto empieza en 1."),
});

export type EntradaResultado = z.infer<typeof esquemaResultado>;

// --- Niveles (bloque B) -----------------------------------------------------

export const esquemaNivel = z.object({
  id: UUID.optional(),
  nombre: z.string().trim().min(3, "El nombre es obligatorio.").max(120, "Máximo 120 caracteres."),
  orden: z.number().int().min(0).default(0),
  rangoEdad: z.string().trim().max(80, "Máximo 80 caracteres.").optional(),
  horario: z.string().trim().max(200, "Máximo 200 caracteres.").optional(),
  descripcion: z.string().trim().max(1000, "Máximo 1000 caracteres.").optional(),
  criterioPromocion: z.string().trim().max(500, "Máximo 500 caracteres.").optional(),
  activo: z.boolean().default(true),
});

export type EntradaNivel = z.infer<typeof esquemaNivel>;

/** Reordenar: la lista completa de ids en el orden nuevo. */
export const esquemaReordenarNiveles = z.object({
  ids: z.array(UUID).min(1, "No hay niveles para reordenar."),
});

export type EntradaReordenarNiveles = z.infer<typeof esquemaReordenarNiveles>;

// --- Productos (bloque C) ---------------------------------------------------

export const esquemaProducto = z.object({
  id: UUID.optional(),
  nombre: z.string().trim().min(3, "El nombre es obligatorio.").max(160, "Máximo 160 caracteres."),
  slug: z
    .string()
    .min(3, "El slug debe tener al menos 3 caracteres.")
    .max(160)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones."),
  categoria: z.enum(["uniformes", "proteccion", "merchandising"], {
    message: "Elige una categoría.",
  }),
  descripcion: z
    .string()
    .trim()
    .max(2000, "Máximo 2000 caracteres.")
    .transform((texto) => (texto === "" ? null : texto))
    .optional(),
  activo: z.boolean().default(true),
  orden: z.number().int().min(0, "El orden no puede ser negativo.").default(0),
});

export type EntradaProducto = z.infer<typeof esquemaProducto>;

/**
 * Una variante del editor, en línea. El precio llega ya en centavos (el
 * formulario convierte con pesosACentavos antes de enviar) y el stock se
 * recibe separado de stock_reservado, que este esquema ni ve: solo lo mueven
 * las RPC del ciclo de inventario.
 */
export const esquemaVariantePanel = z.object({
  id: UUID.optional(),
  talla: z.string().trim().min(1, "La talla es obligatoria.").max(20, "Máximo 20 caracteres."),
  precioCentavos: z
    .number()
    .int("El precio debe ser un entero en centavos.")
    .positive("El precio debe ser mayor que cero."),
  stock: z.number().int("El stock debe ser un entero.").min(0, "El stock no puede ser negativo."),
  sku: z
    .string()
    .trim()
    .max(40, "Máximo 40 caracteres.")
    .transform((texto) => (texto === "" ? null : texto))
    .optional(),
  activo: z.boolean().default(true),
});

export type EntradaVariantePanel = z.infer<typeof esquemaVariantePanel>;

/** Subir la foto de un producto ya creado. */
export const esquemaImagenProducto = z.object({
  id: UUID,
  imagenPath: z.string().max(400),
});

export type EntradaImagenProducto = z.infer<typeof esquemaImagenProducto>;

// --- Pedidos (bloque C) ------------------------------------------------------

export const esquemaTransicionPedido = z.object({
  id: UUID,
  nuevoEstado: z.enum(
    ["pendiente", "pagado", "rechazado", "expirado", "preparando", "entregado", "cancelado"],
    { message: "Estado inválido." },
  ),
});

export type EntradaTransicionPedido = z.infer<typeof esquemaTransicionPedido>;

// --- Bitácora (bloque C) ------------------------------------------------------

export const esquemaFiltrosBitacora = z.object({
  entidad: z.string().trim().max(40).optional(),
  accion: z
    .enum(["crear", "actualizar", "eliminar", "publicar", "archivar", "cambiar_estado"])
    .optional(),
  /** Fechas solas, sin hora: vienen de input[type=date]. */
  desde: z.string().date("Fecha inválida.").optional(),
  hasta: z.string().date("Fecha inválida.").optional(),
  pagina: z.coerce.number().int().min(1).default(1),
});

export type EntradaFiltrosBitacora = z.infer<typeof esquemaFiltrosBitacora>;
