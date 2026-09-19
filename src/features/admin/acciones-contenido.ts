"use server";

import { exigirAdmin } from "@/lib/auth";
import { ErrorApp } from "@/lib/errors";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { ejecutarRpc, revalidarPublico } from "./mutations";
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
import { validarArchivo } from "@/lib/utils/archivos";

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
    // guardar_documento con p_id actualiza; p_titulo null deja el título como estaba.
    await ejecutarRpc("guardar_documento", { p_id: id, p_activo: activo });
    revalidarPublico("documento");
    return { ok: true, mensaje: activo ? "Documento activado." : "Documento desactivado." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

/**
 * Publicar una versión nueva: la única forma de cambiar el archivo de un
 * documento. El PDF se valida DOS veces (cliente y aquí) y se sube ANTES de
 * insertar la fila: si la fila falla, queda un objeto huérfano sin referencia,
 * pero si se insertara primero y la subida fallara, habría una fila vigente
 * apuntando al vacío. El orden de los daños importa.
 */
export async function publicarVersionDocumento(
  entrada: EntradaPublicarVersion,
  archivo: File,
): Promise<ResultadoEscritura> {
  const datos = esquemaPublicarVersion.safeParse(entrada);
  if (!datos.success) {
    return { ok: false, error: Object.values(camposDeZod(datos.error))[0] ?? "Revisa los datos." };
  }

  try {
    await exigirAdmin();

    // Validación de contenido real: firma de bytes y tamaño.
    const veredicto = await validarArchivo(archivo, { mimesPermitidos: MIMES_PDF, maximoBytes: MAXIMO_PDF_BYTES });
    if (!veredicto.ok) {
      return {
        ok: false,
        error:
          veredicto.error === "grande"
            ? "El PDF supera el tope de 10 MB."
            : veredicto.error === "vacio"
              ? "El archivo está vacío."
              : "El archivo no es un PDF válido: la extensión dice una cosa y el contenido otra.",
      };
    }

    const supabase = crearClienteAdmin();
    const d = datos.data;

    // El archivo ya se subió desde el navegador con la sesión del admin; la
    // fila se inserta por RPC con la service role. La ruta la valida el CHECK
    // documento_version_ruta_versionada (migración 03).
    const fila = await ejecutarRpc("publicar_documento_version", {
      p_documento_id: d.documentoId,
      p_version: d.version,
      p_storage_path: d.storagePath,
      p_nombre_archivo: d.nombreArchivo,
      p_tamano_bytes: d.tamanoBytes,
    });

    void fila;
    void supabase;
    revalidarPublico("documento");
    return { ok: true, mensaje: `Versión ${d.version} publicada. La anterior quedó archivada.` };
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
    await ejecutarRpc("guardar_competencia", {
      p_id: c.id,
      p_titulo: c.titulo,
      p_slug: c.slug,
      p_fecha: c.fecha,
      p_cuerpo: c.cuerpo ?? undefined,
      p_estado: "borrador",
      p_destacado: false,
      p_imagen_path: c.imagenPath ?? undefined,
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
    // publicar es actualizar el estado; guardar_competencia con p_estado publicado.
    await ejecutarRpc("guardar_competencia", {
      p_id: id,
      p_estado: "publicado",
      p_autorizacion_imagen: autorizacionImagen,
      p_imagen_path: imagenPath ?? undefined,
    });
    revalidarPublico("competencia");
    return { ok: true, mensaje: "Competencia publicada." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

export async function archivarCompetencia(id: string): Promise<ResultadoEscritura> {
  try {
    await ejecutarRpc("guardar_competencia", { p_id: id, p_estado: "archivado" });
    revalidarPublico("competencia");
    return { ok: true, mensaje: "Competencia archivada." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

/** Destacar: el trigger desmarca la anterior. La UI advierte el efecto. */
export async function destacarCompetencia(id: string, destacar: boolean): Promise<ResultadoEscritura> {
  try {
    await ejecutarRpc("guardar_competencia", { p_id: id, p_destacado: destacar });
    revalidarPublico("competencia");
    return {
      ok: true,
      mensaje: destacar ? "Competencia destacada: la anterior dejó de estarlo." : "Destaque retirado.",
    };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

/**
 * Subir la foto de una competencia. La autorización de imagen debe estar
 * marcada ANTES de permitir la carga: en las fotos hay menores de edad.
 */
export async function subirImagenCompetencia(id: string, archivo: File): Promise<ResultadoEscritura & { imagenPath?: string }> {
  try {
    await exigirAdmin();

    const veredicto = await validarArchivo(archivo, { mimesPermitidos: MIMES_IMAGEN, maximoBytes: MAXIMO_IMAGEN_BYTES });
    if (!veredicto.ok) {
      return {
        ok: false,
        error:
          veredicto.error === "grande"
            ? "La imagen supera el tope de 10 MB."
            : veredicto.error === "vacio"
              ? "El archivo está vacío."
              : "El archivo no es una imagen válida (JPEG, PNG, WebP o AVIF).",
      };
    }

    // Renombrado a UUID: el nombre original nunca llega a Storage.
    const extension = veredicto.mime === "image/jpeg" ? "jpg" : veredicto.mime.split("/")[1] ?? "img";
    const ruta = `${id}/${crypto.randomUUID()}.${extension}`;

    const supabase = crearClienteAdmin();
    const { error } = await supabase.storage.from(BUCKET_COMPETENCIAS).upload(ruta, archivo, {
      contentType: veredicto.mime,
      upsert: false,
    });
    if (error) throw error;

    await ejecutarRpc("guardar_competencia", { p_id: id, p_imagen_path: ruta });
    revalidarPublico("competencia");
    return { ok: true, mensaje: "Imagen cargada.", imagenPath: ruta };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

// --- Resultados -----------------------------------------------------------------

export async function guardarResultado(entrada: EntradaResultado): Promise<ResultadoEscritura> {
  const datos = esquemaResultado.safeParse(entrada);
  if (!datos.success) {
    return { ok: false, error: Object.values(camposDeZod(datos.error))[0] ?? "Revisa los datos." };
  }

  try {
    await ejecutarRpc("guardar_resultado", {
      p_competencia_id: datos.data.competenciaId,
      p_rider: datos.data.rider,
      p_categoria: datos.data.categoria,
      p_puesto: datos.data.puesto,
    });
    revalidarPublico("competencia");
    return { ok: true, mensaje: "Resultado agregado." };
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

export async function guardarNivel(entrada: EntradaNivel): Promise<ResultadoEscritura> {
  const datos = esquemaNivel.safeParse(entrada);
  if (!datos.success) {
    return { ok: false, error: Object.values(camposDeZod(datos.error))[0] ?? "Revisa los datos." };
  }

  try {
    const n = datos.data;
    await ejecutarRpc("guardar_nivel", {
      p_id: n.id,
      p_nombre: n.nombre,
      p_orden: n.orden,
      p_rango_edad: n.rangoEdad || undefined,
      p_horario: n.horario || undefined,
      p_descripcion: n.descripcion || undefined,
      p_criterio_promocion: n.criterioPromocion || undefined,
      p_activo: n.activo,
    });
    revalidarPublico("nivel");
    return { ok: true, mensaje: n.id ? "Nivel actualizado." : "Nivel creado." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

/**
 * Reordenar: la RPC escribe la secuencia completa en una transacción con el
 * UNIQUE diferido (migración 11). El cliente manda el orden completo de ids.
 */
export async function reordenarNiveles(ids: string[]): Promise<ResultadoEscritura> {
  const datos = esquemaReordenarNiveles.safeParse({ ids });
  if (!datos.success) {
    return { ok: false, error: Object.values(camposDeZod(datos.error))[0] ?? "No hay niveles para reordenar." };
  }

  try {
    await ejecutarRpc("reordenar_niveles", { p_ids: datos.data.ids });
    revalidarPublico("nivel");
    return { ok: true, mensaje: "Orden actualizado." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

export async function alternarNivel(id: string, activo: boolean): Promise<ResultadoEscritura> {
  try {
    await ejecutarRpc("guardar_nivel", { p_id: id, p_activo: activo });
    revalidarPublico("nivel");
    return { ok: true, mensaje: activo ? "Nivel activado." : "Nivel desactivado." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

// --- Utilidades -----------------------------------------------------------------

/**
 * El número de versión y la ruta del PDF se deciden ANTES de subir: la versión
 * va dentro de la ruta (migración 03). El cliente llama esto primero, sube el
 * archivo a la ruta recibida y al final llama publicarVersionDocumento.
 */
export async function prepararVersionDocumento(documentoId: string): Promise<
  | { ok: true; version: number; storagePath: string; bucket: string }
  | { ok: false; error: string }
> {
  try {
    await exigirAdmin();
    if (!/^[0-9a-f-]{36}$/i.test(documentoId)) return { ok: false, error: "Documento inválido." };

    const version = await ejecutarRpc("siguiente_version_documento", { p_documento_id: documentoId });
    return {
      ok: true,
      version,
      storagePath: `documentos/${documentoId}/v${version}/${crypto.randomUUID()}.pdf`,
      bucket: BUCKET_DOCUMENTOS,
    };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

export async function subirPdfDocumento(storagePath: string, archivo: File): Promise<ResultadoEscritura> {
  try {
    await exigirAdmin();

    const veredicto = await validarArchivo(archivo, { mimesPermitidos: MIMES_PDF, maximoBytes: MAXIMO_PDF_BYTES });
    if (!veredicto.ok) {
      return {
        ok: false,
        error:
          veredicto.error === "grande"
            ? "El PDF supera el tope de 10 MB."
            : veredicto.error === "vacio"
              ? "El archivo está vacío."
              : "El archivo no es un PDF válido.",
      };
    }

    // La ruta debe tener el formato documentos/{documento_id}/v{version}/...
    // que valida el CHECK de la migración 03; no se acepta cualquiera.
    if (!/^documentos\/[0-9a-f-]{36}\/v\d+\/[0-9a-f-]{36}\.pdf$/.test(storagePath)) {
      return { ok: false, error: "La ruta de destino no es válida." };
    }

    const supabase = crearClienteAdmin();
    const { error } = await supabase.storage.from(BUCKET_DOCUMENTOS).upload(storagePath, archivo, {
      contentType: "application/pdf",
      upsert: false,
    });
    if (error) {
      if (error.message.includes("exists") || String(error.statusCode) === "409") {
        return { ok: false, error: "Esa versión ya se publicó. Recarga la página e inténtalo de nuevo." };
      }
      throw error;
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

export type { EntradaDocumento, EntradaCompetencia, EntradaResultado, EntradaNivel };
