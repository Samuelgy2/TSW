/**
 * Validación de subidas.
 *
 * El tipo MIME que manda el navegador (`File.type`) viene del nombre del
 * archivo, no de su contenido: renombrar `malware.exe` a `foto.pdf` lo hace
 * pasar por PDF. Lo que no se puede fingir tan fácil son los primeros bytes
 * del archivo, su "firma", y esa es la que se verifica aquí.
 *
 * La validación se hace DOS veces: en el cliente, para no subir 10 MB para
 * que los rechacen, y en el servidor (Server Action), que es la que cuenta.
 * Storage de Supabase aplica además su propio `allowed_mime_types`, pero
 * basándose en el Content-Type declarado, no en el contenido.
 */

/** Firmas de los tipos que el sitio acepta, con su offset y cola opcional. */
const FIRMAS: {
  mime: string;
  offset: number;
  bytes: number[];
  nombre: string;
  offsetCola?: number;
  bytesCola?: number[];
}[] = [
  // %PDF-
  { mime: "application/pdf", offset: 0, bytes: [0x25, 0x50, 0x44, 0x46, 0x2d], nombre: "PDF" },
  // FF D8 FF: JPEG en sus tres variantes de marcador SOI.
  { mime: "image/jpeg", offset: 0, bytes: [0xff, 0xd8, 0xff], nombre: "JPEG" },
  // 89 50 4E 47 0D 0A 1A 0A
  {
    mime: "image/png",
    offset: 0,
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    nombre: "PNG",
  },
  // RIFF....WEBP
  { mime: "image/webp", offset: 0, bytes: [0x52, 0x49, 0x46, 0x46], nombre: "WebP", offsetCola: 8, bytesCola: [0x57, 0x45, 0x42, 0x50] },
  // ..ftypavif / ftyp con marca en 4..8
  {
    mime: "image/avif",
    offset: 4,
    bytes: [0x66, 0x74, 0x79, 0x70],
    nombre: "AVIF",
    offsetCola: 8,
    bytesCola: [0x61, 0x76, 0x69, 0x66],
  },
] as const;

type Firma = (typeof FIRMAS)[number];

function coincide(firma: Firma, bytes: Uint8Array): boolean {
  if (bytes.length < firma.offset + firma.bytes.length) return false;
  for (let i = 0; i < firma.bytes.length; i++) {
    if (bytes[firma.offset + i] !== firma.bytes[i]) return false;
  }
  if (firma.bytesCola) {
    if (bytes.length < firma.offsetCola! + firma.bytesCola.length) return false;
    for (let i = 0; i < firma.bytesCola.length; i++) {
      if (bytes[firma.offsetCola! + i] !== firma.bytesCola[i]) return false;
    }
  }
  return true;
}

/**
 * MIME real del archivo según su contenido, o null si la firma no corresponde
 * a ningún tipo conocido del sitio.
 */
export function mimeReal(entrada: Uint8Array): string | null {
  const bytes = entrada;

  for (const firma of FIRMAS) {
    if (coincide(firma, bytes)) return firma.mime;
  }
  return null;
}

export type ErrorArchivo = "vacio" | "grande" | "tipo" | "lectura";

/**
 * Valida tamaño y contenido real. `mimesPermitidos` compara contra el MIME
 * detectado por firma, no contra `File.type`.
 */
export async function validarArchivo(
  archivo: File,
  opciones: { mimesPermitidos: readonly string[]; maximoBytes: number },
): Promise<{ ok: true; mime: string } | { ok: false; error: ErrorArchivo }> {
  if (archivo.size === 0) return { ok: false, error: "vacio" };
  if (archivo.size > opciones.maximoBytes) return { ok: false, error: "grande" };

  let bytes: Uint8Array;
  try {
    // Solo los primeros bytes hacen falta para la firma; se recorta antes de
    // copiar para no cargar en memoria un PDF de 10 MB dos veces.
    const cabeza = archivo.slice(0, 64);
    bytes = new Uint8Array(await cabeza.arrayBuffer());
  } catch {
    return { ok: false, error: "lectura" };
  }

  const mime = mimeReal(bytes);
  if (!mime || !opciones.mimesPermitidos.includes(mime)) return { ok: false, error: "tipo" };
  return { ok: true, mime };
}

/** Mensajes en español de cada caso de validación. */
export const MENSAJE_ERROR_ARCHIVO: Record<ErrorArchivo, string> = {
  vacio: "El archivo está vacío.",
  grande: "El archivo pesa más del máximo permitido.",
  tipo: "El archivo no es del tipo esperado: la extensión dice una cosa y el contenido otra.",
  lectura: "No se pudo leer el archivo. Inténtalo de nuevo.",
};

/** 940 -> "940 B"; 245760 -> "240 KB"; 3145728 -> "3,0 MB". */
export function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("es-CO", { maximumFractionDigits: 1 })} MB`;
}
