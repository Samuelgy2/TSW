"use server";

import { exigirAdmin } from "@/lib/auth";
import { ErrorApp } from "@/lib/errors";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { BUCKET_SITIO, MAXIMO_IMAGEN_SITIO_BYTES, MIMES_IMAGEN_SITIO } from "@/features/sitio/imagenes";
import { ejecutarRpc, revalidarPublico } from "./mutations";
import {
  descartarSubida,
  extensionDe,
  firmarSubida,
  validarDeclarado,
  verificarSubida,
  type SubidaPreparada,
} from "./subida-directa";
import { BUCKET_DOCUMENTOS, BUCKET_COMPETENCIAS, MAXIMO_IMAGEN_BYTES, MAXIMO_PDF_BYTES, MIMES_IMAGEN, MIMES_PDF } from "./constantes";
import {
  esquemaCompetencia,
  esquemaDocumento,
  esquemaNivel,
  esquemaPublicarCompetencia,
  esquemaPublicarVersion,
  esquemaReordenarNiveles,
  esquemaResultado,
  type EntradaCompetencia,
  type EntradaDocumento,
  type EntradaNivel,
  type EntradaPublicarVersion,
  type EntradaResultado,
} from "./schemas";
import type { Resultado } from "./types";

/** Resultado de una acción de escritura cuando no redirige. */
export type ResultadoEscritura = { ok: true; mensaje?: string } | { ok: false; error: string };

/** Errors de la app ya vienen con su mensaje legible; los demás, genérico. */
function mensajeDe(error: unknown): string {
  if (error instanceof ErrorApp) return error.message;
  console.error("[acciones panel]", error);
  return "No se pudo guardar. Inténtalo de nuevo en un momento.";
}

function camposDeZod(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const campos: Record<string, string> = {};
  for (const problema of error.issues) {
    const clave = String(problema.path[0] ?? "_");
    campos[clave] ??= problema.message;
  }
  return campos;
}

// --- Documentos ---------------------------------------------------------------

export async function guardarDocumento(entrada: EntradaDocumento): Promise<ResultadoEscritura> {
  const datos = esquemaDocumento.safeParse(entrada);
  if (!datos.success) {
    return { ok: false, error: Object.values(camposDeZod(datos.error))[0] ?? "Revisa los datos." };
  }

  try {
    const d = datos.data;
    await ejecutarRpc("guardar_documento", {
      p_id: d.id,
      p_titulo: d.titulo,
      p_descripcion: d.descripcion ?? undefined,
      p_activo: d.activo,
      p_orden: d.orden,
    });
    revalidarPublico("documento");
    return { ok: true, mensaje: d.id ? "Documento actualizado." : "Documento creado." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

export async function alternarDocumento(id: string, activo: boolean): Promise<ResultadoEscritura> {
  try {
    // Acción parcial: RPC mínima (migración 11). guardar_documento es
    // reemplazo total y aquí borraría descripción y orden.
    await ejecutarRpc("alternar_documento_activo", { p_id: id, p_activo: activo });
    revalidarPublico("documento");
    return { ok: true, mensaje: activo ? "Documento activado." : "Documento desactivado." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

const OPCIONES_PDF = { mimesPermitidos: MIMES_PDF, maximoBytes: MAXIMO_PDF_BYTES };

/**
 * Publicar una versión nueva: la única forma de cambiar el archivo de un
 * documento. Es el paso 3 de la subida directa (ver `subida-directa.ts`): el
 * PDF ya está en Storage, en la ruta que firmó `prepararVersionDocumento`.
 *
 * Se sube ANTES de insertar: si se insertara primero y la subida fallara,
 * habría una fila vigente apuntando al vacío. Y si la fila falla después —dos
 * publicaciones a la vez que pidieron el mismo número de versión, por
 * ejemplo—, el PDF se borra: nadie lo referencia y el bucket es público.
 *
 * La versión sale de la ruta y el tamaño se mide sobre el archivo subido: el
 * navegador no decide ninguno de los dos.
 */
export async function publicarVersionDocumento(entrada: EntradaPublicarVersion): Promise<ResultadoEscritura> {
  const datos = esquemaPublicarVersion.safeParse(entrada);
  if (!datos.success) {
    return { ok: false, error: Object.values(camposDeZod(datos.error))[0] ?? "Revisa los datos." };
  }

  try {
    await exigirAdmin();
    const d = datos.data;

    const partes = /^documentos\/([0-9a-f-]{36})\/v(\d+)\//.exec(d.storagePath);
    if (!partes || partes[1] !== d.documentoId) return { ok: false, error: "La ruta no corresponde a este documento." };
    const version = Number(partes[2]);

    const verificada = await verificarSubida(BUCKET_DOCUMENTOS, d.storagePath, OPCIONES_PDF);
    if (!verificada.ok) return verificada;

    try {
      // La ruta la valida además el CHECK documento_version_ruta_versionada (migración 03).
      await ejecutarRpc("publicar_documento_version", {
        p_documento_id: d.documentoId,
        p_version: version,
        p_storage_path: d.storagePath,
        p_nombre_archivo: d.nombreArchivo,
        p_tamano_bytes: verificada.tamano,
      });
    } catch (error) {
      await descartarSubida(BUCKET_DOCUMENTOS, d.storagePath);
      throw error;
    }

    revalidarPublico("documento");
    return { ok: true, mensaje: `Versión ${version} publicada. La anterior quedó archivada.` };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

// --- Competencias -------------------------------------------------------------

export async function guardarCompetencia(entrada: EntradaCompetencia): Promise<ResultadoEscritura> {
  const datos = esquemaCompetencia.safeParse(entrada);
  if (!datos.success) {
    return { ok: false, error: Object.values(camposDeZod(datos.error))[0] ?? "Revisa los datos." };
  }

  try {
    const c = datos.data;
    // La autorización se registra en la misma transacción: la bitácora guarda
    // quién la marcó y cuándo (columna autorizacion_imagen_en, migración 11).
    // guardar_competencia (migración 11) es reemplazo total del FORMULARIO: no
    // toca estado, destacado ni imagen_path, cada uno tiene su RPC propia.
    await ejecutarRpc("guardar_competencia", {
      p_id: c.id,
      p_titulo: c.titulo,
      p_slug: c.slug,
      p_fecha: c.fecha,
      p_cuerpo: c.cuerpo ?? undefined,
      p_autorizacion_imagen: c.autorizacionImagen,
    });
    revalidarPublico("competencia");
    return { ok: true, mensaje: c.id ? "Borrador actualizado." : "Competencia guardada como borrador." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

export async function publicarCompetencia(id: string, autorizacionImagen: boolean, imagenPath?: string | null): Promise<ResultadoEscritura> {
  const datos = esquemaPublicarCompetencia.safeParse({ id, autorizacionImagen, imagenPath: imagenPath ?? null });
  if (!datos.success) {
    return { ok: false, error: datos.error.issues[0]?.message ?? "Revisa los datos." };
  }

  try {
    // El estado solo cambia por publicar_competencia (migración 11); la
    // autorización de imagen la exige el CHECK de la tabla si hay foto.
    await ejecutarRpc("publicar_competencia", { p_id: id });
    revalidarPublico("competencia");
    return { ok: true, mensaje: "Competencia publicada." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

export async function archivarCompetencia(id: string): Promise<ResultadoEscritura> {
  try {
    await ejecutarRpc("archivar_competencia", { p_id: id });
    revalidarPublico("competencia");
    return { ok: true, mensaje: "Competencia archivada." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

/** Destacar: el trigger desmarca la anterior. La UI advierte el efecto. */
export async function destacarCompetencia(id: string, destacar: boolean): Promise<ResultadoEscritura> {
  try {
    await ejecutarRpc("destacar_competencia", { p_id: id, p_destacado: destacar });
    revalidarPublico("competencia");
    return {
      ok: true,
      mensaje: destacar ? "Competencia destacada: la anterior dejó de estarlo." : "Destaque retirado.",
    };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

const OPCIONES_IMAGEN = { mimesPermitidos: MIMES_IMAGEN, maximoBytes: MAXIMO_IMAGEN_BYTES };
const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Paso 1 de la subida directa de la foto de una competencia (ver
 * `subida-directa.ts`). En las fotos hay menores de edad: NO se firma la
 * subida si la autorización de imagen no está GUARDADA en la base. La casilla
 * marcada en el formulario no basta; antes, marcarla sin guardar dejaba subir
 * la foto al bucket público y la RPC la rechazaba después, con la foto ya
 * publicada.
 */
export async function prepararImagenCompetencia(id: string, mime: string, tamano: number): Promise<SubidaPreparada> {
  try {
    await exigirAdmin();
    if (!UUID.test(id)) return { ok: false, error: "Competencia inválida." };
    const invalido = validarDeclarado(mime, tamano, OPCIONES_IMAGEN);
    if (invalido) return { ok: false, error: invalido };

    const { data, error } = await crearClienteAdmin()
      .from("competencia")
      .select("autorizacion_imagen_en")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, error: "La competencia no existe." };
    if (data.autorizacion_imagen_en === null) {
      return { ok: false, error: "Guarda primero la competencia con la autorización de uso de imagen marcada." };
    }

    // Renombrado a UUID: el nombre original nunca llega a Storage.
    const ruta = `${id}/${crypto.randomUUID()}.${extensionDe(mime)}`;
    return { ok: true, bucket: BUCKET_COMPETENCIAS, ruta, token: await firmarSubida(BUCKET_COMPETENCIAS, ruta) };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

/**
 * Paso 3: verifica el archivo ya subido y escribe la ruta por RPC. Si la RPC
 * falla —por ejemplo, porque la autorización se desmarcó entre medias y el
 * CHECK de la tabla la para—, el archivo se borra: una foto de menores sin
 * autorización no se queda publicada en el bucket.
 */
export async function confirmarImagenCompetencia(
  id: string,
  ruta: string,
): Promise<ResultadoEscritura & { imagenPath?: string }> {
  try {
    await exigirAdmin();
    if (!UUID.test(id)) return { ok: false, error: "Competencia inválida." };
    const patron = new RegExp(`^${id}/[0-9a-f-]{36}\\.(jpg|png|webp|avif)$`);
    if (!patron.test(ruta)) return { ok: false, error: "Ruta de imagen inválida." };

    const verificada = await verificarSubida(BUCKET_COMPETENCIAS, ruta, OPCIONES_IMAGEN);
    if (!verificada.ok) return verificada;

    try {
      // La única forma de escribir competencia.imagen_path (migración 11).
      await ejecutarRpc("establecer_imagen_competencia", { p_id: id, p_imagen_path: ruta });
    } catch (error) {
      await descartarSubida(BUCKET_COMPETENCIAS, ruta);
      throw error;
    }
    revalidarPublico("competencia");
    return { ok: true, mensaje: "Imagen cargada.", imagenPath: ruta };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

// --- Resultados -----------------------------------------------------------------

export async function guardarResultado(
  entrada: EntradaResultado,
): Promise<{ ok: true; mensaje: string; resultado: Resultado } | { ok: false; error: string }> {
  const datos = esquemaResultado.safeParse(entrada);
  if (!datos.success) {
    return { ok: false, error: Object.values(camposDeZod(datos.error))[0] ?? "Revisa los datos." };
  }

  try {
    const resultado = await ejecutarRpc("guardar_resultado", {
      p_competencia_id: datos.data.competenciaId,
      p_rider: datos.data.rider,
      p_categoria: datos.data.categoria,
      p_puesto: datos.data.puesto,
    });
    revalidarPublico("competencia");
    // La fila vuelve al formulario para pintarla sin esperar el refresco.
    return { ok: true, mensaje: "Resultado agregado.", resultado };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

/** Borrar un resultado mal digitado. Existe la RPC eliminar_resultado (migración 11). */
export async function eliminarResultado(id: string): Promise<ResultadoEscritura> {
  try {
    await ejecutarRpc("eliminar_resultado", { p_id: id });
    revalidarPublico("competencia");
    return { ok: true, mensaje: "Resultado eliminado." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

// --- Niveles ------------------------------------------------------------------

export async function guardarNivel(entrada: EntradaNivel): Promise<ResultadoEscritura & { id?: string }> {
  const datos = esquemaNivel.safeParse(entrada);
  if (!datos.success) {
    return { ok: false, error: Object.values(camposDeZod(datos.error))[0] ?? "Revisa los datos." };
  }

  try {
    const n = datos.data;
    const fila = await ejecutarRpc("guardar_nivel", {
      p_id: n.id,
      // Obligatorio desde la migración 17. TypeScript no lo exige porque la
      // RPC le puso DEFAULT null al parámetro, pero la función lanza «Falta el
      // club del nivel.» si llega vacío: el tipo generado no lo ve y el build
      // pasaría con un guardado roto.
      p_club_id: n.clubId,
      p_nombre: n.nombre,
      p_orden: n.orden,
      p_cupo_maximo: n.cupoMaximo ?? undefined,
      p_rango_edad: n.rangoEdad || undefined,
      p_horario: n.horario || undefined,
      p_descripcion: n.descripcion || undefined,
      p_criterio_promocion: n.criterioPromocion || undefined,
      p_activo: n.activo,
    });
    revalidarPublico("nivel");
    return { ok: true, mensaje: n.id ? "Nivel actualizado." : "Nivel creado.", id: fila.id };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

/**
 * Reordenar los niveles DE UN CLUB. Desde la migración 17 el UNIQUE es
 * (club_id, orden) y la RPC exige el conjunto completo de ese club: rechaza
 * listas parciales y listas que mezclen clubes, con mensaje propio.
 */
export async function reordenarNiveles(clubId: string, ids: string[]): Promise<ResultadoEscritura> {
  const datos = esquemaReordenarNiveles.safeParse({ clubId, ids });
  if (!datos.success) {
    return { ok: false, error: Object.values(camposDeZod(datos.error))[0] ?? "No hay niveles para reordenar." };
  }

  try {
    await ejecutarRpc("reordenar_niveles", { p_club_id: datos.data.clubId, p_ids: datos.data.ids });
    revalidarPublico("nivel");
    return { ok: true, mensaje: "Orden actualizado." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

export async function alternarNivel(id: string, activo: boolean): Promise<ResultadoEscritura> {
  try {
    // Acción parcial: RPC mínima (migración 11). guardar_nivel es reemplazo
    // total y aquí vaciaría rango, horario, descripción y criterio.
    await ejecutarRpc("alternar_nivel_activo", { p_id: id, p_activo: activo });
    revalidarPublico("nivel");
    return { ok: true, mensaje: activo ? "Nivel activado." : "Nivel desactivado." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

// --- Imagen del nivel ----------------------------------------------------------

const OPCIONES_IMAGEN_NIVEL = { mimesPermitidos: MIMES_IMAGEN_SITIO, maximoBytes: MAXIMO_IMAGEN_SITIO_BYTES };
const UUID_NIVEL = /^[0-9a-f-]{36}$/i;
const RUTA_IMAGEN_NIVEL = /^niveles\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

/** Ruta que tiene hoy el nivel, para borrar el archivo viejo al reemplazar o quitar. */
async function imagenActualDeNivel(id: string): Promise<string | null> {
  const { data } = await crearClienteAdmin().from("nivel").select("imagen_path").eq("id", id).maybeSingle();
  return data?.imagen_path ?? null;
}

/** Paso 1 de la imagen de un nivel: tipo y tamaño declarados, ruta con UUID, URL firmada. */
export async function prepararImagenNivel(id: string, mime: string, tamano: number): Promise<SubidaPreparada> {
  try {
    await exigirAdmin();
    if (!UUID_NIVEL.test(id)) return { ok: false, error: "Nivel inválido." };
    const invalido = validarDeclarado(mime, tamano, OPCIONES_IMAGEN_NIVEL);
    if (invalido) return { ok: false, error: invalido };

    const ruta = `niveles/${crypto.randomUUID()}.${extensionDe(mime)}`;
    return { ok: true, bucket: BUCKET_SITIO, ruta, token: await firmarSubida(BUCKET_SITIO, ruta) };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

/**
 * Paso 3: verifica el archivo ya subido y solo entonces lo fija con
 * `establecer_imagen_nivel`. Si la RPC falla, el archivo nuevo se borra; si
 * sale bien, se borra el anterior (bucket público: un archivo sin fila no está
 * huérfano, está publicado).
 */
export async function confirmarImagenNivel(id: string, ruta: string): Promise<ResultadoEscritura & { ruta?: string }> {
  try {
    await exigirAdmin();
    if (!UUID_NIVEL.test(id)) return { ok: false, error: "Nivel inválido." };
    if (!RUTA_IMAGEN_NIVEL.test(ruta)) return { ok: false, error: "Ruta de imagen inválida." };

    const verificada = await verificarSubida(BUCKET_SITIO, ruta, OPCIONES_IMAGEN_NIVEL);
    if (!verificada.ok) return verificada;

    const anterior = await imagenActualDeNivel(id);
    try {
      await ejecutarRpc("establecer_imagen_nivel", { p_id: id, p_imagen_path: ruta });
    } catch (error) {
      await descartarSubida(BUCKET_SITIO, ruta);
      throw error;
    }
    if (anterior && anterior !== ruta && RUTA_IMAGEN_NIVEL.test(anterior)) await descartarSubida(BUCKET_SITIO, anterior);
    revalidarPublico("nivel");
    return { ok: true, mensaje: "Imagen cargada.", ruta };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

/** Quita la imagen: la tarjeta vuelve al marcador y el archivo se borra del bucket. */
export async function quitarImagenNivel(id: string): Promise<ResultadoEscritura> {
  try {
    if (!UUID_NIVEL.test(id)) return { ok: false, error: "Nivel inválido." };
    const anterior = await imagenActualDeNivel(id);
    await ejecutarRpc("establecer_imagen_nivel", { p_id: id, p_imagen_path: "" });
    if (anterior && RUTA_IMAGEN_NIVEL.test(anterior)) await descartarSubida(BUCKET_SITIO, anterior);
    revalidarPublico("nivel");
    return { ok: true, mensaje: "Imagen quitada." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

// --- Utilidades -----------------------------------------------------------------

/**
 * Paso 1 de la subida directa del PDF: el número de versión y la ruta se
 * deciden ANTES de subir, porque la versión va dentro de la ruta (migración
 * 03). Después el navegador sube a esa ruta con el token, y al final llama a
 * `publicarVersionDocumento`, que saca la versión de la misma ruta.
 */
export async function prepararVersionDocumento(documentoId: string, mime: string, tamano: number): Promise<SubidaPreparada> {
  try {
    await exigirAdmin();
    if (!UUID.test(documentoId)) return { ok: false, error: "Documento inválido." };
    const invalido = validarDeclarado(mime, tamano, OPCIONES_PDF);
    if (invalido) return { ok: false, error: invalido };

    const version = await ejecutarRpc("siguiente_version_documento", { p_documento_id: documentoId });
    const ruta = `documentos/${documentoId}/v${version}/${crypto.randomUUID()}.pdf`;
    return { ok: true, bucket: BUCKET_DOCUMENTOS, ruta, token: await firmarSubida(BUCKET_DOCUMENTOS, ruta) };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

export type { EntradaDocumento, EntradaCompetencia, EntradaResultado, EntradaNivel };
