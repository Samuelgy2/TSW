import { crearClienteNavegador } from "@/lib/supabase/browser";
import { MENSAJE_ERROR_ARCHIVO, validarArchivo } from "@/lib/utils/archivos";
import type { SubidaPreparada } from "./subida-directa";

/**
 * Los tres pasos de `subida-directa.ts` vistos desde el navegador: preparar
 * (acción), subir directo a Storage con el token, y confirmar (acción). El
 * archivo nunca viaja dentro de una Server Action, así que el tope de 4,5 MB
 * de Vercel no lo toca.
 *
 * El MIME que se declara es el detectado por firma de bytes aquí mismo, no
 * `File.type`, que sale de la extensión. El servidor lo vuelve a comprobar en
 * `confirmar`, sobre el objeto ya subido.
 */
export async function subirDirecto<R extends { ok: true } | { ok: false; error: string }>(
  archivo: File,
  opciones: { mimesPermitidos: readonly string[]; maximoBytes: number },
  preparar: (mime: string, tamano: number) => Promise<SubidaPreparada>,
  confirmar: (ruta: string) => Promise<R>,
): Promise<R | { ok: false; error: string }> {
  const veredicto = await validarArchivo(archivo, opciones);
  if (!veredicto.ok) return { ok: false, error: MENSAJE_ERROR_ARCHIVO[veredicto.error] };

  const preparada = await preparar(veredicto.mime, archivo.size);
  if (!preparada.ok) return preparada;

  const { error } = await crearClienteNavegador()
    .storage.from(preparada.bucket)
    .uploadToSignedUrl(preparada.ruta, preparada.token, archivo, { contentType: veredicto.mime });
  if (error) return { ok: false, error: "No se pudo subir el archivo. Revisa la conexión e inténtalo de nuevo." };

  return confirmar(preparada.ruta);
}
