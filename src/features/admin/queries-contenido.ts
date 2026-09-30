import "server-only";

import { exigirAdmin } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { CLAVES_CONTENIDO, type ClaveContenido } from "@/features/sitio/schemas";
import { obtenerMatriculas, obtenerPortada, obtenerSemilleros, obtenerTienda } from "@/features/sitio/queries";
import { nombresDeActores } from "./queries-perfiles";

/**
 * Quién editó cada sección de `contenido_sitio` por última vez, y cuándo.
 *
 * El actor no vive en `contenido_sitio` —esa tabla no tiene columna de
 * autor—, así que sale de la bitácora: el evento más reciente cuyo
 * `entidad_id` es el id ACTUAL de la fila. Es un detalle importante: si la
 * sección se restableció alguna vez, `restablecer_contenido` borra la fila y
 * la siguiente `guardar_contenido` crea una con un id nuevo
 * (`gen_random_uuid()` por defecto). El historial de "quién la editó" empieza
 * de nuevo con esa fila, que es lo correcto: antes del restablecimiento era
 * otro contenido.
 *
 * `null` en todo el registro significa "nadie ha personalizado esta sección":
 * no hay fila, no hay bitácora que mostrar.
 */
export type EdicionSeccion = {
  clave: ClaveContenido;
  personalizada: boolean;
  actualizadoEn: string | null;
  actor: string | null;
};

export async function ultimasEdicionesContenido(): Promise<Record<ClaveContenido, EdicionSeccion>> {
  await exigirAdmin();
  const supabase = await crearClienteServidor();

  const { data: filas, error } = await supabase.from("contenido_sitio").select("id, clave, actualizado_en");
  if (error) throw error;

  const filaPorClave = new Map((filas ?? []).map((f) => [f.clave, f]));
  const ids = (filas ?? []).map((f) => f.id);

  // El evento MÁS RECIENTE por entidad_id. Se pide todo lo que haya —no hay
  // paginación aquí, son a lo sumo 5 filas y un puñado de eventos cada una— y
  // se reduce en JS al primero visto por id, porque el orden ya viene
  // descendente por fecha.
  const eventosPorId = new Map<string, { actor_id: string | null }>();
  if (ids.length > 0) {
    const { data: eventos, error: errorEventos } = await supabase
      .from("evento_auditoria")
      .select("entidad_id, actor_id")
      .eq("entidad", "contenido_sitio")
      .in("entidad_id", ids)
      .order("ocurrido_en", { ascending: false });
    if (errorEventos) throw errorEventos;

    for (const evento of eventos ?? []) {
      if (!eventosPorId.has(evento.entidad_id)) eventosPorId.set(evento.entidad_id, evento);
    }
  }

  const actorIds = [...eventosPorId.values()].map((e) => e.actor_id);
  const nombres = await nombresDeActores(actorIds);

  const resultado = {} as Record<ClaveContenido, EdicionSeccion>;
  for (const clave of CLAVES_CONTENIDO) {
    const fila = filaPorClave.get(clave);
    if (!fila) {
      resultado[clave] = { clave, personalizada: false, actualizadoEn: null, actor: null };
      continue;
    }
    const evento = eventosPorId.get(fila.id);
    const actor = evento?.actor_id ? (nombres[evento.actor_id] ?? null) : null;
    resultado[clave] = { clave, personalizada: true, actualizadoEn: fila.actualizado_en, actor };
  }
  return resultado;
}

/**
 * El contenido EFECTIVO de las cinco secciones, para precargar el formulario
 * del panel. Misma función que usa el sitio público (`obtenerX` de
 * features/sitio/queries.ts): el admin edita exactamente lo que el visitante
 * ve, nunca una copia que pueda desincronizarse.
 */
export async function contenidoParaPanel() {
  await exigirAdmin();
  // Los deportes ya no son una sección de contenido_sitio: ver deportesParaPanel.
  const [portada, matriculas, semilleros, tienda] = await Promise.all([
    obtenerPortada(),
    obtenerMatriculas(),
    obtenerSemilleros(),
    obtenerTienda(),
  ]);
  return { portada, matriculas, semilleros, tienda };
}

export type DeportePanel = {
  id: string;
  slug: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  puntos: string[];
  pie: string;
  imagen_path: string | null;
  activo: boolean;
  orden: number;
};

/**
 * Todos los deportes, activos o no, para la pestaña "Deportes". Con la sesión
 * del administrador: la política de lectura con sesión deja ver también los
 * desactivados (migración 22).
 */
export async function deportesParaPanel(): Promise<DeportePanel[]> {
  await exigirAdmin();
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("deporte")
    .select("id, slug, nombre, categoria, descripcion, puntos, pie, imagen_path, activo, orden")
    .order("orden", { ascending: true })
    .order("creado_en", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type ClubPanel = {
  id: string;
  nombre: string;
  activo: boolean;
  etiqueta: string | null;
  descripcion: string | null;
  subtitulo_tarjeta: string | null;
  vinetas: string[];
  color_identidad: string | null;
  instagram_url: string | null;
  logo_path: string | null;
};

/**
 * Los clubes y programas, activos o no, para la pestaña "Clubes". Desde que la
 * portada pinta la tarjeta de Habilidades Motrices con su subtítulo y sus
 * viñetas, el programa también se edita aquí. Con la
 * sesión del administrador: la lectura con sesión de `club` exige es_admin()
 * (migración 17).
 */
export async function clubesParaPanel(): Promise<ClubPanel[]> {
  await exigirAdmin();
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("club")
    .select("id, nombre, activo, etiqueta, descripcion, subtitulo_tarjeta, vinetas, color_identidad, instagram_url, logo_path")
    .order("orden", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
