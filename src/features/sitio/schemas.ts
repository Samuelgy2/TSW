import { z } from "zod";

/**
 * Un esquema por sección de `contenido_sitio` (migración 19), y por lo mismo
 * que el resto del panel: `guardar_*` es reemplazo total, así que el esquema
 * valida la sección COMPLETA, no un campo suelto.
 *
 * Se usan desde tres sitios con la MISMA copia, a propósito: la capa de
 * lectura pública (`queries.ts`, para saber si una fila vieja sigue teniendo
 * forma válida), el formulario del panel (para no dejar guardar algo roto) y
 * la Server Action que guarda (porque el cliente no es de fiar). Un esquema
 * desincronizado entre esas tres capas es peor que no tener ninguna: deja
 * pasar en un lado lo que otro rechaza.
 *
 * Las cadenas no llevan `.min(1)` salvo donde de verdad hace falta un
 * identificador: el contenido de fábrica está lleno de placeholders entre
 * corchetes (`"[Punto destacado 1]"`), que son cadenas válidas y tienen que
 * seguir siéndolo. Lo que si se exige es la FORMA: objeto, no escalar; array,
 * no objeto suelto.
 */

// --- Deportes ----------------------------------------------------------------

export const esquemaDeporte = z.object({
  id: z.string().min(1, "Falta el identificador del deporte."),
  nombre: z.string(),
  categoria: z.string(),
  descripcion: z.string(),
  puntos: z.array(z.string()),
  /** Ruta local (/imagenes/...) o storage_path del bucket `sitio`. */
  imagen: z.string().nullable(),
  pie: z.string(),
});

export const esquemaDeportes = z.array(esquemaDeporte).min(1, "Debe quedar al menos un deporte.");

export type EntradaDeporte = z.infer<typeof esquemaDeporte>;
export type EntradaDeportes = z.infer<typeof esquemaDeportes>;

// --- Portada -------------------------------------------------------------------

export const esquemaCifraPortada = z.object({
  valor: z.number().finite().nullable(),
  sufijo: z.string().optional(),
  etiqueta: z.string(),
  detalle: z.string(),
});

export const esquemaPilar = z.object({
  id: z.string().min(1),
  titulo: z.string(),
  texto: z.string(),
  pie: z.string(),
});

export const esquemaCanalSede = z.object({
  id: z.string().min(1),
  titulo: z.string(),
  texto: z.string(),
});

export const esquemaPortada = z.object({
  etiquetaEntidad: z.string(),
  presentacion: z.string(),
  aval: z.string(),
  cifras: z.array(esquemaCifraPortada),
  cifraPendiente: z.string(),
  pilaresBajada: z.string(),
  pilares: z.array(esquemaPilar),
  deportesBajada: z.string(),
  cita: z.object({ texto: z.string(), autor: z.string(), cargo: z.string() }),
  sedeBajada: z.string(),
  sede: z.object({
    nombre: z.string(),
    descripcion: z.string(),
    imagen: z.string().nullable(),
    imagenAlt: z.string(),
    canales: z.array(esquemaCanalSede),
  }),
});

export type EntradaPortada = z.infer<typeof esquemaPortada>;

// --- Matrículas ------------------------------------------------------------------

export const esquemaCategoriaMatricula = z.object({
  id: z.string().min(1),
  etiqueta: z.string(),
  titulo: z.string(),
  texto: z.string(),
  edades: z.string(),
});

export const esquemaMatriculas = z.object({
  antetitulo: z.string(),
  cupos: z.object({
    disponibles: z.string(),
    ocupacion: z.number().min(0).max(100).nullable(),
    detalle: z.string(),
  }),
  cierre: z.object({ fecha: z.string(), detalle: z.string() }),
  /** Plantilla con el marcador `{deporte}`. Ver src/features/sitio/textos.ts. */
  categoriasBajada: z.string(),
  categorias: z.array(esquemaCategoriaMatricula),
  documentosBajada: z.string(),
  firmas: z.string(),
  anexos: z.array(z.string()),
  anexosPie: z.string(),
});

export type EntradaMatriculas = z.infer<typeof esquemaMatriculas>;

// --- Semilleros ------------------------------------------------------------------

export const esquemaCifraSemillero = z.object({
  id: z.string().min(1),
  etiqueta: z.string(),
  valor: z.string().nullable(),
  detalle: z.string(),
});

export const esquemaPreguntaSemillero = z.object({
  id: z.string().min(1),
  titulo: z.string(),
  contenido: z.string(),
});

export const esquemaSemilleros = z.object({
  cifras: z.array(esquemaCifraSemillero),
  preguntas: z.array(esquemaPreguntaSemillero),
});

export type EntradaSemilleros = z.infer<typeof esquemaSemilleros>;

// --- Tienda ------------------------------------------------------------------------

export const esquemaBeneficioTienda = z.object({
  id: z.string().min(1),
  titulo: z.string(),
  texto: z.string(),
});

export const esquemaTienda = z.object({
  beneficios: z.array(esquemaBeneficioTienda),
});

export type EntradaTienda = z.infer<typeof esquemaTienda>;

// --- El conjunto de claves, en un solo sitio ------------------------------------

/**
 * Las mismas cinco que el CHECK `contenido_sitio_clave_conocida` de la
 * migración 19 y que las constantes exportadas de `config/contenido.ts`
 * (DEPORTES, PORTADA, MATRICULAS, SEMILLEROS, TIENDA en minúscula). Esas dos
 * ya las cruza `npm run verificar:contenido`; añadir una clave aquí sin
 * añadirla también allá se nota porque el `satisfies Record<ClaveContenido,
 * …>` de abajo deja de compilar si falta una entrada.
 */
export const CLAVES_CONTENIDO = ["deportes", "portada", "matriculas", "semilleros", "tienda"] as const;

export type ClaveContenido = (typeof CLAVES_CONTENIDO)[number];

export const ESQUEMA_POR_CLAVE = {
  deportes: esquemaDeportes,
  portada: esquemaPortada,
  matriculas: esquemaMatriculas,
  semilleros: esquemaSemilleros,
  tienda: esquemaTienda,
} as const satisfies Record<ClaveContenido, z.ZodType>;
