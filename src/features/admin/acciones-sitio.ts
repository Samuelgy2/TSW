"use server";

import { exigirAdmin } from "@/lib/auth";
import { ErrorApp } from "@/lib/errors";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { validarArchivo } from "@/lib/utils/archivos";
import {
  CLAVES_CONTENIDO,
  ESQUEMA_POR_CLAVE,
  type ClaveContenido,
} from "@/features/sitio/schemas";
import { ejecutarRpc, revalidarPublico } from "./mutations";

/** Resultado de una acción de escritura cuando no redirige. */
export type ResultadoEscritura = { ok: true; mensaje?: string } | { ok: false; error: string };

function mensajeDe(error: unknown): string {
  if (error instanceof ErrorApp) return error.message;
  console.error("[acciones sitio]", error);
  return "No se pudo guardar. Inténtalo de nuevo en un momento.";
}

/**
 * Guarda una sección completa: reemplazo total, igual que el resto de los
 * `guardar_*` del panel. El formulario ES el estado completo de la sección; el
 * esquema es el MISMO que valida la lectura pública (features/sitio/schemas.ts),
 * así que lo que el panel deja guardar es, por construcción, lo que la página
 * pública sabe leer.
 *
 * `valor` llega como `unknown` porque cruza el límite Server Action: el cliente
 * no es de fiar aunque sea el propio panel, y `esquema.safeParse` es la validación
 * que de verdad cuenta.
 */
export async function guardarSeccionContenido(clave: ClaveContenido, valor: unknown): Promise<ResultadoEscritura> {
  if (!CLAVES_CONTENIDO.includes(clave)) return { ok: false, error: "Sección inválida." };

  const esquema = ESQUEMA_POR_CLAVE[clave];
  const datos = esquema.safeParse(valor);
  if (!datos.success) {
    return { ok: false, error: datos.error.issues[0]?.message ?? "Revisa los datos." };
  }

  try {
    await ejecutarRpc("guardar_contenido", { p_clave: clave, p_valor: datos.data });
    revalidarPublico(`contenido_${clave}` as const);
    return { ok: true, mensaje: "Sección guardada." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

/**
 * Vuelve la sección a su valor de fábrica (config/contenido.ts): borra la fila
 * personalizada. `restablecer_contenido` no falla si no había nada que borrar.
 *
 * Sin confirmación aquí: la exige la pantalla, con un modal, antes de llamar a
 * esta función. Es una acción que se puede deshacer volviendo a guardar, pero
 * pierde cualquier texto personalizado sin aviso si se dispara por accidente.
 */
export async function restablecerSeccionContenido(clave: ClaveContenido): Promise<ResultadoEscritura> {
  if (!CLAVES_CONTENIDO.includes(clave)) return { ok: false, error: "Sección inválida." };

  try {
    await ejecutarRpc("restablecer_contenido", { p_clave: clave });
    revalidarPublico(`contenido_${clave}` as const);
    return { ok: true, mensaje: "Sección restablecida al valor por defecto." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

/** Solo estos tres: lo que acepta el bucket `sitio` (migración 19). Sin AVIF. */
const MIMES_IMAGEN_SITIO = ["image/jpeg", "image/png", "image/webp"] as const;
const MAXIMO_IMAGEN_SITIO_BYTES = 10 * 1024 * 1024;

export { MIMES_IMAGEN_SITIO, MAXIMO_IMAGEN_SITIO_BYTES };

/**
 * Sube una foto al bucket `sitio` y devuelve su ruta. NO escribe ningún campo:
 * a diferencia de `producto.imagen_path`, aquí la imagen es solo un campo más
 * dentro del jsonb de una sección, y esa sección se guarda entera con
 * `guardarSeccionContenido`. El formulario recibe la ruta, la mete en su
 * borrador local, y el guardado normal la persiste junto con el resto.
 *
 * Tipo y tamaño se comprueban DOS veces: en el cliente (el primitivo `Archivo`,
 * antes de llamar a esto) para no subir 10 MB para que los rechacen, y aquí,
 * por firma de bytes, porque el cliente no es de fiar.
 */
export async function subirImagenSitio(archivo: File): Promise<ResultadoEscritura & { ruta?: string }> {
  try {
    await exigirAdmin();

    const veredicto = await validarArchivo(archivo, {
      mimesPermitidos: MIMES_IMAGEN_SITIO,
      maximoBytes: MAXIMO_IMAGEN_SITIO_BYTES,
    });
    if (!veredicto.ok) {
      return {
        ok: false,
        error:
          veredicto.error === "grande"
            ? "La imagen supera el tope de 10 MB."
            : veredicto.error === "vacio"
              ? "El archivo está vacío."
              : "El archivo no es una imagen válida (JPEG, PNG o WebP).",
      };
    }

    const extension = veredicto.mime === "image/jpeg" ? "jpg" : veredicto.mime.split("/")[1];
    const ruta = `sitio/${crypto.randomUUID()}.${extension}`;

    const supabase = crearClienteAdmin();
    const { error } = await supabase.storage.from("sitio").upload(ruta, archivo, {
      contentType: veredicto.mime,
      upsert: false,
    });
    if (error) throw error;

    return { ok: true, mensaje: "Imagen cargada.", ruta };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}
