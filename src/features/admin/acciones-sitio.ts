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
import { esquemaClub, esquemaReordenarSlidesCarrusel, esquemaSlideCarrusel, type EntradaSlideCarrusel } from "./schemas";
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

// Los deportes ya viven en la tabla `deporte` (migración 22). Mientras el panel
// no tenga su formulario nuevo, guardar la sección escribiría en un JSON que
// nadie lee y parecería que funcionó. Bloque TEMPORAL; sin `export` porque este
// archivo es "use server" (verificar:use-server).
const DEPORTES_EN_MIGRACION: ClaveContenido = "deportes";
const MENSAJE_DEPORTES_EN_MIGRACION = "Los deportes están en migración: la edición vuelve en breve.";

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
  if (clave === DEPORTES_EN_MIGRACION) return { ok: false, error: MENSAJE_DEPORTES_EN_MIGRACION };

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
  if (clave === DEPORTES_EN_MIGRACION) return { ok: false, error: MENSAJE_DEPORTES_EN_MIGRACION };

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

// --- Carrusel de la portada (migración 21) -----------------------------------

/**
 * Reemplazo total del formulario, con `activo` incluido (patrón de
 * guardar_nivel: un interruptor simple, sin efectos sobre otras filas ni
 * reglas propias, no necesita su propia RPC). `imagen_path` queda fuera, por
 * establecerImagenSlideCarrusel.
 */
export async function guardarSlideCarrusel(entrada: EntradaSlideCarrusel): Promise<ResultadoEscritura> {
  const datos = esquemaSlideCarrusel.safeParse(entrada);
  if (!datos.success) return { ok: false, error: datos.error.issues[0]?.message ?? "Revisa los datos." };

  try {
    const s = datos.data;
    await exigirAdmin();
    // Reemplazo total: si el formulario no habla del deporte, se conserva el
    // que la diapositiva ya tiene. Solo `null` explícito quita la etiqueta.
    const deporteId = s.deporteId !== undefined ? s.deporteId : s.id ? await deporteDelSlide(s.id) : null;
    await ejecutarRpc("guardar_slide_carrusel", {
      p_id: s.id,
      p_orden: s.orden,
      p_titulo: s.titulo,
      p_descripcion: s.descripcion ?? undefined,
      p_etiqueta_enlace: s.etiquetaEnlace ?? undefined,
      p_destino_enlace: s.destinoEnlace ?? undefined,
      p_activo: s.activo,
      // `?? undefined` = null en el cable (PostgREST omite la clave, el default
      // es null). Va SIEMPRE escrito: verificar:parametros lo exige.
      p_deporte_id: deporteId ?? undefined,
    });
    revalidarPublico("carrusel_slide");
    return { ok: true, mensaje: s.id ? "Diapositiva actualizada." : "Diapositiva creada." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

/** Deporte con el que está etiquetada una diapositiva hoy (null = sin etiqueta o fila inexistente). */
async function deporteDelSlide(id: string): Promise<string | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("carrusel_slide").select("deporte_id").eq("id", id).maybeSingle();
  if (error) throw error;
  return data?.deporte_id ?? null;
}

/** Alternar activo sin abrir el formulario: relee la fila y reenvía el resto tal cual. */
export async function alternarSlideCarrusel(id: string, activo: boolean): Promise<ResultadoEscritura> {
  try {
    await exigirAdmin();
    const supabase = await crearClienteServidor();
    const { data: actual, error } = await supabase
      .from("carrusel_slide")
      .select("orden, titulo, descripcion, etiqueta_enlace, destino_enlace, deporte_id")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!actual) return { ok: false, error: "La diapositiva no existe." };

    await ejecutarRpc("guardar_slide_carrusel", {
      p_id: id,
      p_orden: actual.orden,
      p_titulo: actual.titulo,
      p_descripcion: actual.descripcion ?? undefined,
      p_etiqueta_enlace: actual.etiqueta_enlace ?? undefined,
      p_destino_enlace: actual.destino_enlace ?? undefined,
      p_activo: activo,
      p_deporte_id: actual.deporte_id ?? undefined,
    });
    revalidarPublico("carrusel_slide");
    return { ok: true, mensaje: activo ? "Diapositiva activada." : "Diapositiva desactivada." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

export async function eliminarSlideCarrusel(id: string): Promise<ResultadoEscritura> {
  try {
    if (!UUID.test(id)) return { ok: false, error: "Diapositiva inválida." };
    await ejecutarRpc("eliminar_slide_carrusel", { p_id: id });
    revalidarPublico("carrusel_slide");
    return { ok: true, mensaje: "Diapositiva eliminada." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

export async function reordenarSlidesCarrusel(ids: string[]): Promise<ResultadoEscritura> {
  const datos = esquemaReordenarSlidesCarrusel.safeParse({ ids });
  if (!datos.success) return { ok: false, error: datos.error.issues[0]?.message ?? "No hay diapositivas para reordenar." };

  try {
    await ejecutarRpc("reordenar_slides_carrusel", { p_ids: datos.data.ids });
    revalidarPublico("carrusel_slide");
    return { ok: true, mensaje: "Orden actualizado." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

/** Paso 1 de la subida directa de la foto de una diapositiva. Mismo bucket y límites que el resto del sitio. */
export async function prepararImagenSlideCarrusel(id: string, mime: string, tamano: number): Promise<SubidaPreparada> {
  try {
    await exigirAdmin();
    if (!UUID.test(id)) return { ok: false, error: "Diapositiva inválida." };
    const invalido = validarDeclarado(mime, tamano, OPCIONES_IMAGEN_SITIO);
    if (invalido) return { ok: false, error: invalido };

    const ruta = `carrusel/${crypto.randomUUID()}.${extensionDe(mime)}`;
    return { ok: true, bucket: BUCKET_SITIO, ruta, token: await firmarSubida(BUCKET_SITIO, ruta) };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

/** Paso 3: verifica el archivo ya subido y lo fija por establecer_imagen_slide_carrusel. Si la RPC falla, se borra. */
export async function confirmarImagenSlideCarrusel(
  id: string,
  ruta: string,
): Promise<ResultadoEscritura & { ruta?: string }> {
  try {
    await exigirAdmin();
    if (!UUID.test(id)) return { ok: false, error: "Diapositiva inválida." };
    if (!/^carrusel\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(ruta)) return { ok: false, error: "Ruta de imagen inválida." };

    const verificada = await verificarSubida(BUCKET_SITIO, ruta, OPCIONES_IMAGEN_SITIO);
    if (!verificada.ok) return verificada;

    try {
      await ejecutarRpc("establecer_imagen_slide_carrusel", { p_id: id, p_imagen_path: ruta });
    } catch (error) {
      await descartarSubida(BUCKET_SITIO, ruta);
      throw error;
    }
    revalidarPublico("carrusel_slide");
    return { ok: true, mensaje: "Imagen cargada.", ruta };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}
