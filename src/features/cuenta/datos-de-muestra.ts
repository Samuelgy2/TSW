// DATOS DE MUESTRA: borrar al conectar la base
//
// Todas las vistas nuevas de la corporación multideporte leen de aquí y de
// ningún otro lado. No hay migraciones ni esquema todavía: cuando la base
// exista, este archivo se borra y las consultas lo reemplazan.
//
// Reglas: valores entre corchetes [ASÍ], ninguna cifra ni nombre real de
// persona, ni fecha que parezca real. Los montos en centavos van como texto
// "[MONTO]" porque el precio es `integer` en centavos y su formato real
// llegará con la columna; no se usa formatearPrecio con números inventados.

import { DEPORTES } from "@/config/contenido";

// --- Deportes ---------------------------------------------------------------
// La lista de deportes es la del sitio público (config/contenido.ts): el
// selector del panel y el público hablan el mismo idioma.

export type DeporteMuestra = {
  id: string;
  nombre: string;
};

export const DEPORTES_MUESTRA: DeporteMuestra[] = DEPORTES.map(({ id, nombre }) => ({ id, nombre }));

/** El deporte con el que arranca el selector antes de que el admin elija. */
export const DEPORTE_POR_DEFECTO_ID = "bmx";

/**
 * Opción "sin deporte" del panel. Un producto con `deporte_id` nulo es
 * merchandising de la marca, común a todos los deportes: el selector del
 * panel necesita poder pararse ahí para administrarlo. En el sitio público
 * no existe: el merchandising aparece bajo cualquier deporte.
 */
export const OPCION_TODOS_LOS_DEPORTES: DeporteMuestra = { id: "todos", nombre: "Marca TSW (todos)" };

// --- Resumen de cuenta (cabecera del área de usuario) -----------------------

export type DeportistaResumen = {
  nombre: string;
  deporte: string;
  nivel: string;
};

export type ResumenCuentaMuestra = {
  titular: string;
  /**
   * `acudiente`: el titular responde por menores. `deportista`: el titular
   * es el deportista adulto. Cambia el layout de ResumenCuenta y las
   * preguntas legales (autorización del acudiente solo en el primero).
   */
  modo: "acudiente" | "deportista";
  deportistas: DeportistaResumen[];
};

/** Caso principal: acudiente con dos menores en deportes distintos. */
export const RESUMEN_CUENTA_MUESTRA: ResumenCuentaMuestra = {
  titular: "[NOMBRE ACUDIENTE]",
  modo: "acudiente",
  deportistas: [
    { nombre: "[DEPORTISTA 1]", deporte: "BMX", nivel: "[NIVEL 1]" },
    { nombre: "[DEPORTISTA 2]", deporte: "[DEPORTE 2]", nivel: "[NIVEL 2]" },
  ],
};

/** Caso secundario: deportista mayor de edad que administra su propia cuenta. */
export const RESUMEN_DEPORTISTA_ADULTO_MUESTRA: ResumenCuentaMuestra = {
  titular: "[NOMBRE DEPORTISTA]",
  modo: "deportista",
  deportistas: [{ nombre: "[NOMBRE DEPORTISTA]", deporte: "BMX", nivel: "[NIVEL]" }],
};

/**
 * Tratamiento de datos (Ley 1581 de 2012). Con menores en la base, cada
 * cuenta de acudiente necesita constancia de la autorización. Aquí solo se
 * muestra el estado; el documento firmado se radica en sede.
 */
export type AutorizacionDatosMuestra = {
  estado: "firmada" | "pendiente";
  /** Fecha de la firma o null si está pendiente. */
  fecha: string | null;
  /** Nombre del formato firmado, o null. */
  documento: string | null;
};

export const AUTORIZACION_DATOS_MUESTRA: AutorizacionDatosMuestra = {
  estado: "pendiente",
  fecha: null,
  documento: "[FORMATO DE AUTORIZACIÓN DE DATOS]",
};

// --- Mensualidades -----------------------------------------------------------

export type EstadoMensualidad = "pagada" | "pendiente" | "vencida";

export type MensualidadMuestra = {
  id: string;
  /** Mes al que corresponde el pago, como "enero de 2026". */
  mes: string;
  estado: EstadoMensualidad;
  /** Monto en centavos o null si todavía no está definido en el esquema. */
  montoCentavos: number | null;
  /** Fecha de pago (si está pagada) o de vencimiento (si no). */
  fecha: string;
  deportista: string;
};

export const MENSUALIDADES_MUESTRA: MensualidadMuestra[] = [
  { id: "m-1", mes: "[MES 1]", estado: "vencida", montoCentavos: null, fecha: "[FECHA VENCIMIENTO]", deportista: "[DEPORTISTA 1]" },
  { id: "m-2", mes: "[MES 2]", estado: "pagada", montoCentavos: null, fecha: "[FECHA DE PAGO]", deportista: "[DEPORTISTA 1]" },
  { id: "m-3", mes: "[MES 3]", estado: "pendiente", montoCentavos: null, fecha: "[FECHA VENCIMIENTO]", deportista: "[DEPORTISTA 1]" },
  { id: "m-4", mes: "[MES 4]", estado: "pendiente", montoCentavos: null, fecha: "[FECHA VENCIMIENTO]", deportista: "[DEPORTISTA 2]" },
];

/**
 * Mes actual del resumen. La fecha real la calculará la base; aquí es una
 * etiqueta de muestra sin fecha inventada.
 */
export const MENSUALIDAD_ACTUAL_MUESTRA: MensualidadMuestra = {
  id: "m-actual",
  mes: "[MES ACTUAL]",
  estado: "pendiente",
  montoCentavos: null,
  fecha: "[FECHA VENCIMIENTO]",
  deportista: "[DEPORTISTA 1]",
};

/**
 * Vista transversal del panel: estado de la mensualidad del mes por
 * deportista, sin importar el titular. Es lo que el club necesita para
 * cobrar: "quién no ha pagado este mes".
 */
export type MensualidadDelMesMuestra = {
  id: string;
  deportista: string;
  titular: string;
  deporte: string;
  estado: EstadoMensualidad;
  /** Fecha de pago si está pagada, de vencimiento si no. */
  fecha: string;
};

export const MENSUALIDADES_DEL_MES_MUESTRA: MensualidadDelMesMuestra[] = [
  { id: "mm-1", deportista: "[DEPORTISTA 1]", titular: "[NOMBRE USUARIO 1]", deporte: "BMX", estado: "pagada", fecha: "[FECHA DE PAGO]" },
  { id: "mm-2", deportista: "[DEPORTISTA 2]", titular: "[NOMBRE USUARIO 1]", deporte: "[DEPORTE 2]", estado: "pendiente", fecha: "[FECHA VENCIMIENTO]" },
  { id: "mm-3", deportista: "[DEPORTISTA 3]", titular: "[NOMBRE USUARIO 2]", deporte: "[DEPORTE 2]", estado: "vencida", fecha: "[FECHA VENCIMIENTO]" },
  { id: "mm-4", deportista: "[DEPORTISTA 4]", titular: "[NOMBRE USUARIO 3]", deporte: "BMX", estado: "pendiente", fecha: "[FECHA VENCIMIENTO]" },
];

// --- Jersey ------------------------------------------------------------------

export type EstadoJersey = "entregado" | "pendiente";

export type JerseyMuestra = {
  id: string;
  talla: string;
  estado: EstadoJersey;
  /** Fecha de entrega, o null si todavía no está agendada. */
  fechaEntrega: string | null;
  /** Número o nombre impreso, si aplica. */
  impresion: string | null;
};

export const JERSEY_MUESTRA: JerseyMuestra = {
  id: "j-1",
  talla: "[TALLA]",
  estado: "pendiente",
  fechaEntrega: "[FECHA DE ENTREGA]",
  impresion: "[NOMBRE IMPRESO]",
};

// --- Historial por año (para /cuenta/mensualidades) ---------------------------

export type AnioMensualidades = {
  anio: string;
  mensualidades: MensualidadMuestra[];
};

export const HISTORIAL_MENSUALIDADES_MUESTRA: AnioMensualidades[] = [
  {
    anio: "[AÑO 1]",
    mensualidades: MENSUALIDADES_MUESTRA,
  },
];
