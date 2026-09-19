import { crearClienteServidor } from "@/lib/supabase/server";
import { exigirAdmin } from "@/lib/auth";
import type { DocumentoConVersiones, CompetenciaConResultados, EventoAuditoria, Nivel } from "./types";
import type { ProductoConVariantes } from "@/features/tienda/types";

// --- Bitácora ---------------------------------------------------------------

export type FiltrosBitacora = {
  entidad?: string;
  accion?: string;
  /** ISO: solo fechas, no timestamps. */
  desde?: string;
  hasta?: string;
  pagina?: number;
};

export const POR_PAGINA_BITACORA = 20;

function limpiar(valor: string | undefined): string | undefined {
  const texto = valor?.trim();
  return texto ? texto : undefined;
}

/**
 * Página de la bitácora con filtros por entidad, acción y rango de fechas.
 * Paginada a propósito: esta tabla crece sin parar. `total` alimenta el
 * paginador; viene del conteo con head:true.
 */
export async function listarBitacora(
  filtros: FiltrosBitacora = {},
): Promise<{ eventos: EventoAuditoria[]; total: number; pagina: number }> {
  await exigirAdmin();

  const pagina = Math.max(1, Math.trunc(filtros.pagina ?? 1));
  const supabase = await crearClienteServidor();

  let consulta = supabase
    .from("evento_auditoria")
    .select("*", { count: "exact" })
    .order("ocurrido_en", { ascending: false })
    .range((pagina - 1) * POR_PAGINA_BITACORA, pagina * POR_PAGINA_BITACORA - 1);

  const entidad = limpiar(filtros.entidad);
  const accion = limpiar(filtros.accion);
  const desde = limpiar(filtros.desde);
  const hasta = limpiar(filtros.hasta);

  if (entidad) consulta = consulta.eq("entidad", entidad);
  // El filtro llega como texto de la URL; si no es una acción válida, la
  // consulta simplemente no filtra por acción (PostgREST ignora valores
  // imposibles al no coincidir ninguna fila). Se valida contra el enum para
  // que el tipo sea honesto.
  const accionesValidas = ["crear", "actualizar", "eliminar", "publicar", "archivar", "cambiar_estado"] as const;
  const accionValida = accionesValidas.find((a) => a === accion);
  if (accionValida) consulta = consulta.eq("accion", accionValida);
  if (desde) consulta = consulta.gte("ocurrido_en", `${desde}T00:00:00Z`);
  if (hasta) consulta = consulta.lte("ocurrido_en", `${hasta}T23:59:59Z`);

  const { data, error, count } = await consulta;
  if (error) throw error;

  return { eventos: data ?? [], total: count ?? 0, pagina };
}

/** Últimos eventos de la bitácora para el inicio del panel. */
export async function listarAuditoria(limite = 50): Promise<EventoAuditoria[]> {
  await exigirAdmin();

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("evento_auditoria")
    .select("*")
    .order("ocurrido_en", { ascending: false })
    .limit(limite);

  if (error) throw error;
  return data ?? [];
}

// --- Inicio -----------------------------------------------------------------

export type ResumenPanel = {
  /** Sin registro de descargas en el esquema: siempre null hasta que exista. */
  descargasDelMes: number | null;
  pedidosPendientes: number;
  pedidosPagados: number;
  competenciasPublicadas: number;
};

/**
 * Cifras del inicio del panel. Conteos con `head: true`: no bajan filas.
 * Se leen con la sesión del administrador, así que RLS aplica igual.
 */
export async function resumenPanel(): Promise<ResumenPanel> {
  await exigirAdmin();
  const supabase = await crearClienteServidor();

  const [pendientes, pagados, publicadas] = await Promise.all([
    supabase.from("pedido").select("*", { count: "exact", head: true }).eq("estado", "pendiente"),
    supabase.from("pedido").select("*", { count: "exact", head: true }).not("pagado_en", "is", null),
    supabase.from("competencia").select("*", { count: "exact", head: true }).eq("estado", "publicado"),
  ]);

  for (const respuesta of [pendientes, pagados, publicadas]) {
    if (respuesta.error) throw respuesta.error;
  }

  return {
    descargasDelMes: null,
    pedidosPendientes: pendientes.count ?? 0,
    pedidosPagados: pagados.count ?? 0,
    competenciasPublicadas: publicadas.count ?? 0,
  };
}

// --- Documentos ---------------------------------------------------------------

/**
 * Documentos con su historial completo de versiones, de la más nueva a la
 * más vieja. El panel sí ve los inactivos y los archivados: eso es lo que
 * los distingue de la vista pública.
 */
export async function listarDocumentosPanel(): Promise<DocumentoConVersiones[]> {
  await exigirAdmin();

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("documento")
    .select("*, documento_version(*)")
    .order("orden", { ascending: true })
    .order("titulo", { ascending: true });

  if (error) throw error;

  return (data ?? []).map(({ documento_version, ...documento }) => ({
    ...documento,
    versiones: (documento_version ?? []).sort((a, b) => b.version - a.version),
  }));
}

// --- Competencias -------------------------------------------------------------

/**
 * Todas las competencias (borrador, publicado y archivado) con sus
 * resultados, del calendario más reciente al más antiguo.
 */
export async function listarCompetenciasPanel(): Promise<CompetenciaConResultados[]> {
  await exigirAdmin();

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("competencia")
    .select("*, resultado(*)")
    .order("fecha", { ascending: false });

  if (error) throw error;

  return (data ?? []).map(({ resultado, ...competencia }) => ({
    ...competencia,
    resultados: (resultado ?? []).sort(
      (a, b) => a.categoria.localeCompare(b.categoria) || a.puesto - b.puesto,
    ),
  }));
}

// --- Niveles ------------------------------------------------------------------

/** Todos los niveles, activos e inactivos, en su orden de presentación. */
export async function listarNivelesPanel(): Promise<Nivel[]> {
  await exigirAdmin();

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("nivel")
    .select("*")
    .order("orden", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// --- Productos (bloque C) -----------------------------------------------------

/**
 * Catálogo completo para el panel: activos e inactivos, con sus variantes.
 * El público solo ve activos; el administrador necesita ver todo para poder
 * reactivar.
 */
export async function listarProductosPanel(): Promise<ProductoConVariantes[]> {
  await exigirAdmin();

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("producto")
    .select("*, variante(*)")
    .order("orden", { ascending: true })
    .order("nombre", { ascending: true });

  if (error) throw error;

  return (data ?? []).map(({ variante, ...producto }) => ({
    ...producto,
    variantes: (variante ?? []).sort((a, b) => a.talla.localeCompare(b.talla, "es", { numeric: true })),
  }));
}
