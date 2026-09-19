import type { Enums, Tables } from "@/lib/supabase/database.types";

export type EventoAuditoria = Tables<"evento_auditoria">;
export type AccionAuditoria = Enums<"accion_auditoria">;

/** Tablas con trigger de auditoría. */
export type EntidadAuditable =
  | "documento"
  | "documento_version"
  | "producto"
  | "variante"
  | "competencia"
  | "resultado"
  | "nivel"
  | "pedido"
  | "pedido_item"
  | "transaccion";

/** Etiquetas de la bitácora para la interfaz del panel. */
export const ETIQUETA_ACCION: Record<AccionAuditoria, string> = {
  crear: "Creó",
  actualizar: "Actualizó",
  eliminar: "Eliminó",
  publicar: "Publicó",
  archivar: "Archivó",
  cambiar_estado: "Cambió el estado",
};

/** Nombre legible de cada entidad auditada. */
export const ETIQUETA_ENTIDAD: Record<EntidadAuditable, string> = {
  documento: "Documento",
  documento_version: "Versión de documento",
  producto: "Producto",
  variante: "Variante",
  competencia: "Competencia",
  resultado: "Resultado",
  nivel: "Nivel",
  pedido: "Pedido",
  pedido_item: "Ítem de pedido",
  transaccion: "Transacción",
};

export function etiquetaEntidad(entidad: string): string {
  return (ETIQUETA_ENTIDAD as Record<string, string>)[entidad] ?? entidad;
}

// --- Bloque B: documentos, competencias, niveles ----------------------------

export type Documento = Tables<"documento">;
export type DocumentoVersion = Tables<"documento_version">;
export type Competencia = Tables<"competencia">;
export type Resultado = Tables<"resultado">;
export type Nivel = Tables<"nivel">;
export type EstadoPublicacion = Enums<"estado_publicacion">;

/** Documento con su versión vigente y el conteo del historial. */
export type DocumentoConVersiones = Documento & {
  versiones: DocumentoVersion[];
};

export function versionVigente(documento: DocumentoConVersiones): DocumentoVersion | null {
  return documento.versiones.find((v) => v.archivado_en === null) ?? null;
}

export type CompetenciaConResultados = Competencia & {
  resultados: Resultado[];
};
