import { crearClienteServidor } from "@/lib/supabase/server";
import { exigirAdmin } from "@/lib/auth";
import type { EventoAuditoria } from "./types";

/** Últimos eventos de la bitácora. Solo visible para el administrador. */
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
