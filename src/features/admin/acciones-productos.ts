"use server";

import { exigirAdmin } from "@/lib/auth";
import { ErrorApp } from "@/lib/errors";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { ejecutarRpc, revalidarPublico } from "./mutations";
import { BUCKET_PRODUCTOS, MAXIMO_IMAGEN_BYTES, MIMES_IMAGEN } from "./constantes";
import {
  esquemaProducto,
  esquemaVariantePanel,
  type EntradaProducto,
  type EntradaVariantePanel,
} from "./schemas";
import { validarArchivo } from "@/lib/utils/archivos";

/** Resultado de una acción de escritura cuando no redirige. */
export type ResultadoEscritura = { ok: true; mensaje?: string } | { ok: false; error: string };

/** Los errores de la app ya vienen legibles; los demás, genérico y registrado. */
function mensajeDe(error: unknown): string {
  if (error instanceof ErrorApp) return error.message;
  console.error("[acciones productos]", error);
  return "No se pudo guardar. Inténtalo de nuevo en un momento.";
}

// --- Productos ---------------------------------------------------------------

export async function guardarProducto(entrada: EntradaProducto): Promise<ResultadoEscritura> {
  const datos = esquemaProducto.safeParse(entrada);
  if (!datos.success) {
    return { ok: false, error: datos.error.issues[0]?.message ?? "Revisa los datos." };
  }

  try {
    const p = datos.data;
    await ejecutarRpc("guardar_producto", {
      p_id: p.id,
      p_nombre: p.nombre,
      p_slug: p.slug,
      p_categoria: p.categoria,
      p_descripcion: p.descripcion ?? undefined,
      p_activo: p.activo,
      p_orden: p.orden,
    });
    revalidarPublico("producto");
    return { ok: true, mensaje: p.id ? "Producto actualizado." : "Producto creado." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

/**
 * Subir la foto del producto. El archivo se valida por firma de bytes aquí
 * también: el cliente no se confía. Se renombra a UUID —el nombre original
 * nunca llega a Storage— y la ruta se escribe por RPC con el actor.
 */
export async function subirImagenProducto(
  id: string,
  archivo: File,
): Promise<ResultadoEscritura & { imagenPath?: string }> {
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

    if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "Producto inválido." };

    const extension = veredicto.mime === "image/jpeg" ? "jpg" : veredicto.mime.split("/")[1] ?? "img";
    const ruta = `productos/${crypto.randomUUID()}.${extension}`;

    const supabase = crearClienteAdmin();
    const { error } = await supabase.storage.from(BUCKET_PRODUCTOS).upload(ruta, archivo, {
      contentType: veredicto.mime,
      upsert: false,
    });
    if (error) throw error;

    await ejecutarRpc("guardar_producto", { p_id: id, p_imagen_path: ruta });
    revalidarPublico("producto");
    return { ok: true, mensaje: "Imagen cargada.", imagenPath: ruta };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

/**
 * Desactivar en vez de eliminar. La FK variante → producto es RESTRICT y
 * pedido_item → variante también: un producto con pedidos no se puede borrar,
 * y la base lo rechazaría. Aquí ni se intenta: la salida es `activo = false`,
 * que lo saca del catálogo público conservando el historial.
 */
export async function alternarProducto(id: string, activo: boolean): Promise<ResultadoEscritura> {
  try {
    await ejecutarRpc("guardar_producto", { p_id: id, p_activo: activo });
    revalidarPublico("producto");
    return {
      ok: true,
      mensaje: activo
        ? "Producto activado: vuelve a verse en la tienda."
        : "Producto desactivado: ya no se ve en la tienda, pero conserva su historial de pedidos.",
    };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

// --- Variantes -----------------------------------------------------------------

export async function guardarVariante(entrada: EntradaVariantePanel, productoId: string): Promise<ResultadoEscritura> {
  const datos = esquemaVariantePanel.safeParse(entrada);
  if (!datos.success) {
    return { ok: false, error: datos.error.issues[0]?.message ?? "Revisa los datos." };
  }
  if (!/^[0-9a-f-]{36}$/i.test(productoId)) {
    return { ok: false, error: "Producto inválido." };
  }

  try {
    const v = datos.data;
    // guardar_variante no toca stock_reservado: eso solo lo mueve el ciclo de
    // inventario (reservar, liberar, consumir). El panel muestra el reservado
    // aparte y no lo escribe jamás.
    await ejecutarRpc("guardar_variante", {
      p_id: v.id,
      p_producto_id: productoId,
      p_talla: v.talla,
      p_precio_centavos: v.precioCentavos,
      p_stock: v.stock,
      p_sku: v.sku ?? undefined,
      p_activo: v.activo,
    });
    revalidarPublico("producto");
    return { ok: true, mensaje: v.id ? "Variante actualizada." : "Variante agregada." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}

/**
 * Desactivar una variante. No hay eliminar: pedido_item apunta a variante con
 * FK RESTRICT y una variante vendida es parte del histórico de una compra.
 */
export async function alternarVariante(id: string, activo: boolean): Promise<ResultadoEscritura> {
  try {
    await ejecutarRpc("guardar_variante", { p_id: id, p_activo: activo });
    revalidarPublico("producto");
    return { ok: true, mensaje: activo ? "Variante activada." : "Variante desactivada." };
  } catch (error) {
    return { ok: false, error: mensajeDe(error) };
  }
}
