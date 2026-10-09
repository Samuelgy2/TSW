/** Topes de tamaño: Storage aplica los mismos (migración 09). */
export const MAXIMO_PDF_BYTES = 10 * 1024 * 1024;
export const MAXIMO_IMAGEN_BYTES = 10 * 1024 * 1024;

/** MIME permitidos por bucket. */
export const MIMES_PDF = ["application/pdf"] as const;
export const MIMES_IMAGEN = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

/** Buckets de Storage (migración 09). */
export const BUCKET_DOCUMENTOS = "documentos-matricula";
export const BUCKET_PRODUCTOS = "productos";
export const BUCKET_COMPETENCIAS = "competencias";

/** Rutas públicas que toca cada entidad al escribir. Las usa revalidarPublico(). */
export const RUTAS_PUBLICAS = {
  documento: ["/matriculas"],
  nivel: ["/", "/semilleros"],
  competencia: ["/", "/competencias"],
  producto: ["/", "/tienda"],
  pedido: [],
} as const;
