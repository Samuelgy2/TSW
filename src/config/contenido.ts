/**
 * CONTENIDO FIJO DEL SITIO PÚBLICO, EN UN SOLO SITIO.
 *
 * Todo lo que aparece entre corchetes `[ASÍ]` es un marcador: el club envía
 * el dato real y se reemplaza aquí, sin tocar ningún componente. La lista de
 * lo que falta, redactada para el club, está en
 * docs/contenido-pendiente-cliente.md; si agregas un marcador nuevo, agrégalo
 * también allí.
 *
 * Reglas: ninguna cifra, nombre de persona, fecha ni precio inventados. Lo que
 * no se sabe se queda entre corchetes. Los datos de identidad y contacto
 * (nombre, dirección, teléfono, redes, navegación) viven en ./sitio.ts.
 *
 * Lo que NO va aquí: documentos, niveles, competencias y productos, que se
 * administran desde el panel y se leen de Supabase.
 */

import { CONTACTO, IDENTIDAD_LEGAL, SEDES_EN_LINEA, UBICACION } from "./sitio";

// --- Deportes ------------------------------------------------------------------

export type Deporte = {
  /** Identificador estable: va en la URL (?deporte=bmx) y lo usa el panel. */
  id: string;
  nombre: string;
  /** Etiqueta corta sobre la foto: "Semilleros y competencia". */
  categoria: string;
  /** Una o dos frases de presentación. */
  descripcion: string;
  /** Dos o tres puntos cortos con lo que ofrece. */
  puntos: string[];
  /** Foto horizontal en /public/imagenes, o null para el marcador. */
  imagen: string | null;
  /** Texto pequeño al pie de la tarjeta. */
  pie: string;
};

/**
 * Los deportes de la corporación. El primero es el que se muestra por
 * defecto. Cuando exista la tabla `deporte`, esta lista sale del panel.
 */
export const DEPORTES: Deporte[] = [
  {
    id: "bmx",
    nombre: "BMX",
    categoria: "[Semilleros y competencia]",
    descripcion: "[Presentación del BMX en la corporación: a quién va dirigido y qué ofrece.]",
    puntos: ["[Punto destacado 1]", "[Punto destacado 2]"],
    imagen: "/imagenes/escuela.jpg",
    pie: "[Cupos por semestre]",
  },
  {
    id: "deporte-2",
    nombre: "[DEPORTE 2]",
    categoria: "[Categoría del deporte]",
    descripcion: "[Presentación del deporte: a quién va dirigido y qué ofrece.]",
    puntos: ["[Punto destacado 1]", "[Punto destacado 2]"],
    imagen: null,
    pie: "[Cupos por semestre]",
  },
];

// --- Portada ---------------------------------------------------------------------

/**
 * Cifra de la franja azul. `valor` en null significa que el dato todavía no
 * existe: la tarjeta lo muestra como pendiente en vez de inventar un número,
 * y la cuenta ascendente se activa sola en cuanto se escriba una cifra real.
 */
export type Cifra = {
  valor: number | null;
  sufijo?: string;
  etiqueta: string;
  /** Texto de apoyo bajo la cifra. */
  detalle: string;
};

export const PORTADA = {
  /** Etiqueta pequeña sobre el titular: tipo de entidad. */
  etiquetaEntidad: "[Entidad deportiva]",
  presentacion: "[Presentación de la corporación en dos frases: qué deportes forma, para quién y con qué enfoque.]",
  // Del documento de la cliente (seccion 1). Se arma con IDENTIDAD_LEGAL para
  // no repetir las dos afiliaciones en dos archivos.
  aval: `${IDENTIDAD_LEGAL.reconocimiento} · ${IDENTIDAD_LEGAL.afiliacion}`,
  cifras: [
    { valor: null, sufijo: "+", etiqueta: "[Deportistas formados]", detalle: "[Texto de apoyo de la cifra.]" },
    { valor: null, sufijo: "", etiqueta: "[Años de trayectoria]", detalle: "[Texto de apoyo de la cifra.]" },
    { valor: null, sufijo: "", etiqueta: "[Competencias al año]", detalle: "[Texto de apoyo de la cifra.]" },
    { valor: null, sufijo: "", etiqueta: "[Niveles de formación]", detalle: "[Texto de apoyo de la cifra.]" },
  ] satisfies Cifra[],
  /** Texto de apoyo cuando una cifra sigue en null. */
  cifraPendiente: "[Pendiente de confirmar por el club.]",
  pilaresBajada: "[Bajada: cómo entiende la corporación la formación deportiva.]",
  pilares: [
    { id: "formacion", titulo: "[Pilar 1: formación]", texto: "[Qué distingue la metodología de la corporación.]", pie: "[Estándar o aval]" },
    { id: "etica", titulo: "[Pilar 2: ética y convivencia]", texto: "[Compromisos con deportistas y familias.]", pie: "[Comité o reglamento]" },
    { id: "salud", titulo: "[Pilar 3: salud y bienestar]", texto: "[Acompañamiento médico y físico.]", pie: "[Acompañamiento]" },
  ],
  deportesBajada: "[Bajada: los deportes que forma la corporación y cómo se organizan.]",
  cita: {
    texto: "[Frase institucional de la corporación, una o dos líneas, en palabras de su dirección.]",
    autor: "[NOMBRE]",
    cargo: "[CARGO]",
  },
  sedeBajada: "[Bajada: dónde entrena la corporación y cómo se atiende a las familias.]",
  sede: {
    nombre: "[Nombre de la sede]",
    descripcion: "[Qué hay en la sede: pista, oficina, taquilla.]",
    imagen: "/imagenes/sede.jpg",
    imagenAlt: "[Foto o mapa de la sede]",
    /**
     * Los canales que el documento cubre. El de dirección de calle NO está: la
     * cliente da dos pistas y un barrio, y nada más. Un canal "Sede
     * administrativa" con "[Dirección completa]" dentro es peor que no tenerlo.
     */
    canales: [
      { id: "sedes", titulo: "Sedes de entrenamiento", texto: `${SEDES_EN_LINEA} — ${UBICACION}` },
      { id: "horario", titulo: "Horario de atención", texto: CONTACTO.horario },
      {
        id: "linea",
        titulo: "WhatsApp y correo",
        texto: `${CONTACTO.telefono} · ${CONTACTO.telefonoSecundario} · ${CONTACTO.correo}`,
      },
    ],
  },
} as const;

// --- Matrículas --------------------------------------------------------------------

export type CategoriaMatricula = {
  id: string;
  etiqueta: string;
  titulo: string;
  texto: string;
  /** Rango de edades, como texto: "[4 a 13 años]". */
  edades: string;
};

export const MATRICULAS = {
  /** Etiqueta sobre el título: estado de la convocatoria. */
  antetitulo: "[Convocatoria abierta]",
  /** Cupos del periodo. `ocupacion` (0-100) pinta la barra; null la oculta. */
  cupos: {
    disponibles: "[CIFRA]",
    ocupacion: null as number | null,
    detalle: "[Ocupación del periodo por categoría.]",
  },
  cierre: {
    fecha: "[FECHA]",
    detalle: "[Hasta cuándo se reciben carpetas sin recargo.]",
  },
  /**
   * Plantilla con el marcador `{deporte}`, no una función: la sección entera
   * viaja como jsonb hacia `contenido_sitio` (migración 19), y una función no
   * es serializable. `interpolarDeporte()` (features/sitio/textos.ts) hace el
   * reemplazo en el punto de uso.
   */
  categoriasBajada: "[Cómo se organiza la vinculación en {deporte}.]",
  categorias: [
    {
      id: "semilleros",
      etiqueta: "[Desarrollo de talentos]",
      titulo: "[Plan semilleros e iniciación]",
      texto: "[Qué incluye el plan de iniciación y cómo se promueve.]",
      edades: "[Edades]",
    },
    {
      id: "rendimiento",
      etiqueta: "[Selección]",
      titulo: "[Plan de alto rendimiento]",
      texto: "[Qué incluye el plan competitivo y sus requisitos.]",
      edades: "[Edades]",
    },
  ] satisfies CategoriaMatricula[],
  documentosBajada:
    "Cada archivo indica su versión vigente y su fecha de publicación. Estos formatos aplican para todos los clubes y programas de la corporación.",
  /** Paso 2 de la hoja de ruta. */
  firmas: "[Indicar si se firman a mano o se aceptan firmas digitales.]",
  /** Paso 3: anexos que acompañan a los formatos. */
  anexos: [
    "[Documento de identidad del deportista]",
    "[Documento de identidad del acudiente]",
    "[Certificado médico o afiliación a salud]",
    "[Otros anexos que pida el club]",
  ],
  anexosPie: "[Lo que acompaña a los formatos]",
} as const;

// --- Semilleros ------------------------------------------------------------------

export const SEMILLEROS = {
  /**
   * Cifras de la metodología, tomadas del documento del cliente (22-09-2026).
   * Son de la corporación, no de un club: los dos clubes trabajan los mismos
   * tres niveles con el mismo cuerpo técnico.
   */
  cifras: [
    {
      id: "niveles",
      etiqueta: "3 niveles",
      valor: "3" as string | null,
      detalle: "De formación: Minirider, Intermedio y Avanzado.",
    },
    {
      id: "cupo",
      etiqueta: "14 máximo",
      valor: "14" as string | null,
      detalle: "Deportistas por grupo en Minirider e Intermedio (25 en Avanzado).",
    },
    {
      id: "entrenadores",
      etiqueta: "5 entrenadores",
      valor: "5" as string | null,
      detalle: "Ex atletas de BMX y licenciados en deporte.",
    },
  ],
  /** Preguntas frecuentes, del documento del cliente. */
  preguntas: [
    {
      id: "edad",
      titulo: "¿Desde qué edad se puede ingresar?",
      contenido:
        "Desde los 2 años y medio, en el nivel Minirider con bici de impulso. No se necesita experiencia previa. El Programa de Habilidades Motrices recibe personas de todas las edades.",
    },
    {
      id: "prueba",
      titulo: "¿Puedo hacer una clase de prueba?",
      contenido:
        "Sí, y es gratis. Escríbenos por WhatsApp y la agendamos. Te prestamos la bicicleta y el casco; solo tienes que llegar con ropa cómoda.",
    },
    {
      id: "bicicleta",
      titulo: "¿Hay que tener bicicleta y protección propias?",
      contenido:
        "Para las clases de prueba te prestamos la bicicleta y el casco. Después, cada rider debe tener su propio casco y su protección. Para iniciar también podemos prestar la bicicleta, aunque lo ideal es tener una propia; nuestros entrenadores te orientan sobre cuál comprar según la edad y el nivel.",
    },
    {
      id: "horarios",
      titulo: "¿Cuáles son los horarios de entrenamiento?",
      contenido:
        "Dependen del club y del nivel. Consulta la ficha de cada nivel en esta página o escríbenos por WhatsApp.",
    },
    {
      id: "promocion",
      titulo: "¿Cómo se pasa de un nivel al siguiente?",
      contenido:
        "Nuestros entrenadores evalúan a cada rider de forma periódica. Cuando domina las habilidades de su nivel, pasa al siguiente y se le informa a la familia. En TSW, el ingreso al nivel Avanzado, que es el grupo competitivo del club, se define según el desempeño y los resultados.",
    },
    {
      id: "costos",
      titulo: "¿Cuánto cuestan la matrícula y la mensualidad?",
      contenido:
        "Escríbenos por WhatsApp y te compartimos los valores vigentes y lo que incluyen.",
    },
  ],
} as const;

// --- Tienda ------------------------------------------------------------------------

export const TIENDA = {
  beneficios: [
    { id: "oficial", titulo: "[Dotación oficial]", texto: "[Prendas aprobadas para entrenar y competir.]" },
    { id: "retiro", titulo: "[Retiro en sede]", texto: "[Dónde y cuándo se entregan los pedidos.]" },
    { id: "personalizacion", titulo: "[Personalización]", texto: "[Qué se puede estampar y cómo se pide.]" },
  ],
} as const;
