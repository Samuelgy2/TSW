import { z } from "zod";

import { LARGO_CODIGO_ACCESO } from "./constantes";

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

// --- Clubes -----------------------------------------------------------------

/**
 * Lo que el panel deja editar de un club. Slug, tipo, deporte y orden no están
 * en el formulario: el slug va en los enlaces `?club=` y cambiarlo los rompería.
 * `guardarClub` los relee de la fila y los reenvía, porque `guardar_club` es
 * reemplazo total. Vacío en los opcionales = se borra el dato.
 */
export const esquemaClub = z.object({
  id: UUID,
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(80, "Nombre: máximo 80 caracteres.")
    .refine((texto) => !/<[a-z!/]/i.test(texto), { message: "No se permite formato HTML en este campo." }),
  etiqueta: TEXTO_SEGURO("Etiqueta", 80),
  descripcion: TEXTO_SEGURO("Descripción", 1200),
  /** Texto corto de la tarjeta pequeña de la portada. Vacío = sin subtítulo. */
  subtituloTarjeta: TEXTO_SEGURO("Texto de la tarjeta pequeña", 60),
  /** Hasta 4 puntos cortos; el formulario descarta los vacíos antes de validar. */
  vinetas: z
    .array(TEXTO_SEGURO("Viñeta", 120).refine((texto) => texto.trim() !== "", { message: "Hay una viñeta vacía." }))
    .max(4, "Un club admite como máximo 4 viñetas."),
  colorIdentidad: z
    .string()
    .trim()
    .regex(/^(#[0-9a-fA-F]{6})?$/, "El color va como #RRGGBB: numeral y seis caracteres."),
  instagramUrl: z
    .string()
    .trim()
    .refine((url) => url === "" || /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]+\/?$/.test(url), {
      message: "Pega el enlace completo del perfil: https://www.instagram.com/usuario",
    }),
});

export type EntradaClub = z.infer<typeof esquemaClub>;

// --- Deportes (migración 22) ---------------------------------------------------

/**
 * Lo que el formulario deja editar de un deporte. Sin slug, orden, activo ni
 * imagen: el slug es inmutable, el orden se relee de la fila, y activo e
 * imagen tienen su propia RPC (alternar_deporte_activo, establecer_imagen_deporte).
 * Los tamaños son los del diseño de la tarjeta, no los de la base.
 */
export const esquemaDeportePanel = z.object({
  id: UUID,
  nombre: z.string().trim().min(1, "El nombre es obligatorio.").max(60, "Máximo 60 caracteres."),
  categoria: z.string().trim().max(80, "La categoría admite hasta 80 caracteres."),
  descripcion: z.string().trim().max(600, "La descripción admite hasta 600 caracteres."),
  puntos: z
    .array(z.string().trim().max(120, "Cada punto destacado admite hasta 120 caracteres."))
    .max(6, "Máximo 6 puntos destacados."),
  pie: z.string().trim().max(120, "El pie de tarjeta admite hasta 120 caracteres."),
});

export type EntradaDeportePanel = z.infer<typeof esquemaDeportePanel>;

// --- Carrusel de la portada (migración 21) -----------------------------------

export const esquemaSlideCarrusel = z
  .object({
    id: UUID.optional(),
    orden: z.number().int().min(0).default(0),
    titulo: z.string().trim().min(1, "El título es obligatorio.").max(120, "Máximo 120 caracteres."),
    descripcion: z.string().trim().max(300, "Máximo 300 caracteres.").optional(),
    etiquetaEnlace: z.string().trim().max(40, "Máximo 40 caracteres.").optional(),
    // Ruta interna o ancla. Sin esquema ni dominio: nunca un enlace externo.
    destinoEnlace: z
      .string()
      .trim()
      .regex(
        /^(\/[a-z0-9/_-]*|#[a-z0-9-]+|https:\/\/wa\.me\/57[0-9]{10})$/,
        "Escribe una ruta interna (/semilleros), un ancla (#seccion) o un enlace de WhatsApp (https://wa.me/57…).",
      )
      .optional(),
    activo: z.boolean().default(true),
    // Tres estados a propósito: uuid = asignar, null = quitar la etiqueta,
    // ausente = no tocar (la acción relee el valor actual). guardar_slide_carrusel
    // es reemplazo total, así que "ausente" nunca puede viajar tal cual a la RPC.
    deporteId: UUID.nullable().optional(),
  })
  .refine((v) => Boolean(v.etiquetaEnlace) === Boolean(v.destinoEnlace), {
    message: "El texto y el destino del botón van juntos: pon los dos o ninguno.",
    path: ["destinoEnlace"],
  });

export type EntradaSlideCarrusel = z.infer<typeof esquemaSlideCarrusel>;

export const esquemaReordenarSlidesCarrusel = z.object({
  ids: z.array(UUID).min(1, "No hay diapositivas para reordenar."),
});

export type EntradaReordenarSlidesCarrusel = z.infer<typeof esquemaReordenarSlidesCarrusel>;

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

/** Pedir un código de acceso por correo. Solo el correo; el destino viaja aparte. */
export const esquemaSolicitudCodigo = z.object({
  correo: z.string().trim().email("Escribe un correo válido."),
});

export type EntradaSolicitudCodigo = z.infer<typeof esquemaSolicitudCodigo>;

/**
 * Verificar el código. El largo sale de LARGO_CODIGO_ACCESO, no de un número
 * escrito aquí: el dashboard de Supabase decide cuántos dígitos manda, y si
 * esto dijera 6 con un dashboard en 8, la pantalla rechazaría códigos
 * correctos sin llegar a consultarlos.
 */
export const esquemaVerificacionCodigo = z.object({
  correo: z.string().trim().email("Escribe un correo válido."),
  codigo: z
    .string()
    .trim()
    // `\\d` y no `\d`: dentro de una plantilla, `\d` se queda en la letra d.
    .regex(
      new RegExp(`^\\d{${LARGO_CODIGO_ACCESO}}$`),
      `El código tiene ${LARGO_CODIGO_ACCESO} dígitos.`,
    ),
  redirigir: z.string().optional(),
});

export type EntradaVerificacionCodigo = z.infer<typeof esquemaVerificacionCodigo>;

export const esquemaNuevaContrasena = z
  .object({
    contrasena: z
      .string()
      .min(12, "Usa al menos 12 caracteres.")
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
/**
 * Sin `version` ni `tamanoBytes`: los decide el servidor. La versión va dentro
 * de la ruta que firmó `prepararVersionDocumento`, y el tamaño se mide sobre el
 * archivo ya subido. Lo que manda el navegador de esos dos datos no se usa.
 */
export const esquemaPublicarVersion = z.object({
  documentoId: UUID,
  nombreArchivo: z.string().min(1).max(255),
  storagePath: z
    .string()
    .regex(/^documentos\/[0-9a-f-]{36}\/v\d+\/[0-9a-f-]{36}\.pdf$/, "La ruta no cumple el formato versionado."),
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
  /** Obligatorio desde la migración 17: un nivel sin club no se lista ni se ordena. */
  clubId: UUID,
  nombre: z.string().trim().min(3, "El nombre es obligatorio.").max(120, "Máximo 120 caracteres."),
  orden: z.number().int().min(0).default(0),
  cupoMaximo: z
    .number()
    .int("El cupo debe ser un entero.")
    .positive("El cupo debe ser mayor que cero.")
    .nullable()
    .optional(),
  rangoEdad: z.string().trim().max(80, "Máximo 80 caracteres.").optional(),
  horario: z.string().trim().max(200, "Máximo 200 caracteres.").optional(),
  descripcion: z.string().trim().max(1000, "Máximo 1000 caracteres.").optional(),
  criterioPromocion: z.string().trim().max(500, "Máximo 500 caracteres.").optional(),
  activo: z.boolean().default(true),
});

export type EntradaNivel = z.infer<typeof esquemaNivel>;

/** Reordenar: la lista completa de ids en el orden nuevo. */
export const esquemaReordenarNiveles = z.object({
  /** El reordenamiento es DENTRO de un club: la RPC rechaza listas que mezclen. */
  clubId: UUID,
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
  /**
   * Tipo de prenda. Nulable: la migración 17 dejó sin clasificar los productos
   * de la semilla, y obligar aquí impediría editarles cualquier otra cosa
   * hasta elegirles prenda.
   */
  categoria: z.enum(["buso", "guantes", "camiseta", "gorra"]).nullable().optional(),
  /** Club dueño. Nulo = merchandising de la marca TSW, común a todos. */
  clubId: UUID.nullable().optional(),
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

// --- Perfiles: administradores y usuarios (migración 13) ---------------------

const NOMBRE_PERFIL = z
  .string()
  .trim()
  .min(2, "El nombre es obligatorio.")
  .max(120, "Máximo 120 caracteres.");

const CORREO = z.string().trim().toLowerCase().email("Escribe un correo válido.");

/** Teléfono opcional: en blanco es "sin teléfono", nunca cadena vacía. */
const TELEFONO = z
  .string()
  .trim()
  .max(30, "Máximo 30 caracteres.")
  .regex(/^[0-9+() -]*$/, "Solo números, espacios y el signo +.")
  .transform((valor) => (valor === "" ? null : valor))
  .nullable()
  .optional();

export const esquemaInvitacionAdmin = z.object({
  nombre: NOMBRE_PERFIL,
  correo: CORREO,
});

export type EntradaInvitacionAdmin = z.infer<typeof esquemaInvitacionAdmin>;

export const esquemaInvitacionUsuario = z.object({
  nombre: NOMBRE_PERFIL,
  correo: CORREO,
  telefono: TELEFONO,
});

export type EntradaInvitacionUsuario = z.infer<typeof esquemaInvitacionUsuario>;

export const esquemaEdicionAdmin = z.object({
  id: UUID,
  nombre: NOMBRE_PERFIL,
});

export type EntradaEdicionAdmin = z.infer<typeof esquemaEdicionAdmin>;

export const esquemaEdicionUsuario = z.object({
  id: UUID,
  nombre: NOMBRE_PERFIL,
  telefono: TELEFONO,
});

export type EntradaEdicionUsuario = z.infer<typeof esquemaEdicionUsuario>;
