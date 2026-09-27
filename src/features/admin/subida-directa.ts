import "server-only";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { urlPublicaStorage } from "@/lib/supabase/storage";
import { mimeReal } from "@/lib/utils/archivos";

/**
 * Subida directa del navegador a Storage, sin pasar el archivo por la función.
 *
 * Por qué: Vercel corta el cuerpo de una petición a una función en 4,5 MB,
 * diga lo que diga `bodySizeLimit`. Con el archivo dentro de la Server Action,
 * cualquier foto o PDF de 4,5 a 10 MB moría con 413 aunque el formulario
 * prometiera 10 MB.
 *
 * El flujo tiene tres pasos, y el orden es la garantía:
 *
 *   1. preparar (servidor): exigirAdmin, tipo y tamaño DECLARADOS, ruta con
 *      UUID, y `firmarSubida`. El token vale 2 horas, para esa ruta exacta, y
 *      no sobrescribe.
 *   2. subir (navegador): `uploadToSignedUrl` directo a Storage. El bucket
 *      aplica su `file_size_limit` y su `allowed_mime_types`, pero el tipo que
 *      mira es el Content-Type declarado, no los bytes.
 *   3. confirmar (servidor): `verificarSubida` lee los primeros bytes del
 *      objeto YA subido y su tamaño real. Si no cuadran, lo borra y rechaza.
 *      Solo después de esto la ruta llega a una tabla.
 *
 * Las políticas de Storage no participan: la URL la firma la service role, y
 * la subida con token no evalúa RLS. La barrera es `exigirAdmin()` en los
 * pasos 1 y 3.
 */

/** Lo que devuelve el paso 1 al navegador. */
export type SubidaPreparada =
  | { ok: true; bucket: string; ruta: string; token: string }
  | { ok: false; error: string };

const EXTENSION_POR_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "application/pdf": "pdf",
};

/** Extensión de archivo para un MIME aceptado, o null si no es uno conocido. */
export function extensionDe(mime: string): string | null {
  return EXTENSION_POR_MIME[mime] ?? null;
}

/**
 * Primera línea de defensa, sobre lo que el navegador DECLARA. No prueba nada
 * del contenido: eso es `verificarSubida`, cuando el archivo ya está subido.
 */
export function validarDeclarado(
  mime: string,
  tamano: number,
  opciones: { mimesPermitidos: readonly string[]; maximoBytes: number },
): string | null {
  if (!opciones.mimesPermitidos.includes(mime) || !extensionDe(mime)) return "El tipo de archivo no está permitido.";
  if (!Number.isInteger(tamano) || tamano <= 0) return "El archivo está vacío.";
  if (tamano > opciones.maximoBytes) return "El archivo pesa más del máximo permitido.";
  return null;
}

/** Token de subida para una ruta exacta del bucket. Firma la service role. */
export async function firmarSubida(bucket: string, ruta: string): Promise<string> {
  const { data, error } = await crearClienteAdmin().storage.from(bucket).createSignedUploadUrl(ruta);
  if (error) throw error;
  return data.token;
}

/**
 * Borra un archivo subido que no llegó a ninguna tabla: rechazado por
 * `verificarSubida`, o porque la RPC que debía referenciarlo falló. En un
 * bucket público, un archivo sin fila no está "huérfano": está publicado.
 */
export async function descartarSubida(bucket: string, ruta: string): Promise<void> {
  const { error } = await crearClienteAdmin().storage.from(bucket).remove([ruta]);
  if (error) console.error("[subida directa] no se pudo borrar un archivo descartado", bucket, ruta, error.message);
}

/**
 * Comprueba el objeto ya subido: firma de bytes, que coincida con la extensión
 * de la ruta, y tamaño real. Si algo falla, BORRA el objeto: un archivo que no
 * pasó no se queda en un bucket público esperando a que alguien lo enlace.
 *
 * Lee con `Range` los primeros 64 bytes por la URL pública (los cuatro buckets
 * son públicos): el tamaño total viene en `Content-Range`, y la función no se
 * baja 10 MB para mirar ocho bytes.
 */
export async function verificarSubida(
  bucket: string,
  ruta: string,
  opciones: { mimesPermitidos: readonly string[]; maximoBytes: number },
): Promise<{ ok: true; mime: string; tamano: number } | { ok: false; error: string }> {
  const respuesta = await fetch(urlPublicaStorage(bucket, ruta), {
    headers: { Range: "bytes=0-63" },
    cache: "no-store",
  });
  if (!respuesta.ok) return { ok: false, error: "El archivo no llegó a Storage. Vuelve a intentarlo." };

  const bytes = new Uint8Array(await respuesta.arrayBuffer()).slice(0, 64);
  // 206 trae "bytes 0-63/<total>"; si el servidor ignorara el Range, 200 con
  // el cuerpo entero y su Content-Length.
  const total = Number(
    respuesta.status === 206
      ? respuesta.headers.get("content-range")?.split("/")[1]
      : respuesta.headers.get("content-length"),
  );

  const mime = mimeReal(bytes);
  const extension = mime ? extensionDe(mime) : null;
  const valido =
    mime !== null &&
    extension !== null &&
    opciones.mimesPermitidos.includes(mime) &&
    ruta.endsWith(`.${extension}`) &&
    Number.isInteger(total) &&
    total > 0 &&
    total <= opciones.maximoBytes;

  if (!valido) {
    await descartarSubida(bucket, ruta);
    return {
      ok: false,
      error:
        Number.isInteger(total) && total > opciones.maximoBytes
          ? "El archivo pesa más del máximo permitido."
          : "El archivo no es del tipo esperado: la extensión dice una cosa y el contenido otra.",
    };
  }

  return { ok: true, mime, tamano: total };
}
