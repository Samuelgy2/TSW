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
