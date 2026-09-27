"use server";

import { revalidatePath } from "next/cache";

import { exigirAdmin } from "@/lib/auth";
import { ErrorApp } from "@/lib/errors";
import { crearClienteServidor } from "@/lib/supabase/server";
import {
  BUCKET_SITIO,
  MAXIMO_IMAGEN_SITIO_BYTES,
  MIMES_IMAGEN_SITIO,
} from "@/features/sitio/imagenes";
import {
  CLAVES_CONTENIDO,
  ESQUEMA_POR_CLAVE,
  type ClaveContenido,
} from "@/features/sitio/schemas";
import { ejecutarRpc, revalidarPublico } from "./mutations";
import { esquemaClub } from "./schemas";
import {
  descartarSubida,
  extensionDe,
  firmarSubida,
  validarDeclarado,
  verificarSubida,
  type SubidaPreparada,
} from "./subida-directa";

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

const OPCIONES_IMAGEN_SITIO = { mimesPermitidos: MIMES_IMAGEN_SITIO, maximoBytes: MAXIMO_IMAGEN_SITIO_BYTES };
const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Paso 1 de la subida directa (ver `subida-directa.ts`): decide la ruta y
 * firma la subida. El archivo no pasa por aquí.
 */
export async function prepararImagenSitio(mime: string, tamano: number): Promise<SubidaPreparada> {
  try {
    await exigirAdmin();
    const invalido = validarDeclarado(mime, tamano, OPCIONES_IMAGEN_SITIO);
    if (invalido) return { ok: false, error: invalido };

    const ruta = `sitio/${crypto.randomUUID()}.${extensionDe(mime)}`;
    return { ok: true, bucket: BUCKET_SITIO, ruta, token: await firmarSubida(BUCKET_SITIO, ruta) };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

/**
 * Paso 3: comprueba por firma de bytes el archivo ya subido y devuelve su
 * ruta. NO escribe ningún campo: aquí la imagen es solo un campo más dentro del
 * jsonb de una sección, y esa sección se guarda entera con
 * `guardarSeccionContenido`. El formulario mete la ruta en su borrador y el
 * guardado normal la persiste junto con el resto.
 */
/**
 * Guarda los datos editables de un club por `guardar_club` (migración 17).
 *
 * `guardar_club` es reemplazo total, pero el formulario no expone slug, tipo,
 * deporte ni orden: esos se releen de la fila y se reenvían tal cual. Tomarlos
 * del navegador sería dejar que el cliente los cambie sin pantalla que lo
 * muestre. Solo filas `tipo = 'club'`: un programa no se edita desde aquí.
 */
export async function guardarClub(entrada: unknown): Promise<ResultadoEscritura> {
  const datos = esquemaClub.safeParse(entrada);
  if (!datos.success) return { ok: false, error: datos.error.issues[0]?.message ?? "Revisa los datos." };

  try {
    await exigirAdmin();
    const c = datos.data;

    const supabase = await crearClienteServidor();
    const { data: actual, error } = await supabase
      .from("club")
      .select("slug, tipo, deporte, orden")
      .eq("id", c.id)
      .maybeSingle();
    if (error) throw error;
    if (!actual || actual.tipo !== "club") return { ok: false, error: "El club no existe." };

    await ejecutarRpc("guardar_club", {
      p_id: c.id,
      p_nombre: c.nombre,
      p_slug: actual.slug,
      p_tipo: actual.tipo,
      p_deporte: actual.deporte,
      p_etiqueta: c.etiqueta,
      p_descripcion: c.descripcion,
      p_color_identidad: c.colorIdentidad,
      p_instagram_url: c.instagramUrl,
      p_orden: actual.orden,
    });

    // El nombre y la etiqueta salen en el menú de clubes del layout, o sea en
    // todas las páginas públicas: se revalida el layout entero, no una ruta.
    revalidatePath("/", "layout");
    return { ok: true, mensaje: "Club guardado." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

export async function prepararLogoClub(id: string, mime: string, tamano: number): Promise<SubidaPreparada> {
  try {
    await exigirAdmin();
    if (!UUID.test(id)) return { ok: false, error: "Club inválido." };
    const invalido = validarDeclarado(mime, tamano, OPCIONES_IMAGEN_SITIO);
    if (invalido) return { ok: false, error: invalido };

    // Mismo bucket que el resto de las imágenes del sitio, en su carpeta.
    const ruta = `clubes/${crypto.randomUUID()}.${extensionDe(mime)}`;
    return { ok: true, bucket: BUCKET_SITIO, ruta, token: await firmarSubida(BUCKET_SITIO, ruta) };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

/**
 * Paso 3 del logo: verifica el archivo y, solo entonces, lo fija con
 * `establecer_logo_club`, el único camino por el que cambia (migración 17),
 * con el actor en la bitácora. Si la RPC falla, el archivo se borra.
 */
export async function confirmarLogoClub(id: string, ruta: string): Promise<ResultadoEscritura & { ruta?: string }> {
  try {
    await exigirAdmin();
    if (!UUID.test(id)) return { ok: false, error: "Club inválido." };
    if (!/^clubes\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(ruta)) return { ok: false, error: "Ruta de imagen inválida." };

    const verificada = await verificarSubida(BUCKET_SITIO, ruta, OPCIONES_IMAGEN_SITIO);
    if (!verificada.ok) return verificada;

    try {
      await ejecutarRpc("establecer_logo_club", { p_id: id, p_logo_path: ruta });
    } catch (error) {
      await descartarSubida(BUCKET_SITIO, ruta);
      throw error;
    }
    revalidarPublico("club");
    return { ok: true, mensaje: "Logo cargado.", ruta };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

/**
 * Quita el logo: el club vuelve a mostrar sus iniciales. El archivo se queda
 * en el bucket, igual que las fotos reemplazadas de productos y competencias:
 * la bitácora conserva la ruta anterior.
 */
export async function quitarLogoClub(id: string): Promise<ResultadoEscritura> {
  try {
    if (!UUID.test(id)) return { ok: false, error: "Club inválido." };
    await ejecutarRpc("establecer_logo_club", { p_id: id, p_logo_path: "" });
    revalidarPublico("club");
    return { ok: true, mensaje: "Logo quitado." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

export async function confirmarImagenSitio(ruta: string): Promise<ResultadoEscritura & { ruta?: string }> {
  try {
    await exigirAdmin();
    if (!/^sitio\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(ruta)) return { ok: false, error: "Ruta de imagen inválida." };

    const verificada = await verificarSubida(BUCKET_SITIO, ruta, OPCIONES_IMAGEN_SITIO);
    if (!verificada.ok) return verificada;
    return { ok: true, mensaje: "Imagen cargada.", ruta };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}
