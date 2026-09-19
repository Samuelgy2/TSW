import "server-only";

import { revalidatePath } from "next/cache";

import { exigirAdmin } from "@/lib/auth";
import { ErrorApp, ErrorConflicto, ErrorNoEncontrado, ErrorValidacion } from "@/lib/errors";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Escrituras del panel.
 *
 * REGLA DEL PROYECTO: el panel nunca escribe directo a las tablas. Cada
 * operación administrativa pasa por una RPC de la base —`guardar_documento`,
 * `publicar_documento_version`, `guardar_producto`, `guardar_variante`,
 * `guardar_competencia`, `guardar_resultado`, `guardar_nivel`,
 * `transicionar_pedido`— que recibe el actor y lo propaga a la bitácora.
 *
 * Las RPC solo están concedidas a `service_role`, así que se invocan con
 * `crearClienteAdmin()` desde Server Actions, nunca desde el navegador. Y como
 * la service role no lleva identidad, el `user.id` de la sesión verificada se
 * pasa como `p_actor_id`: si faltara, la bitácora registraría NULL y dejaría
 * de servir para lo único que sirve, saber quién hizo qué.
 *
 * No hay función para escribir en `evento_auditoria`: la escriben los triggers
 * y un trigger de solo inserción rechaza cualquier UPDATE o DELETE, incluso
 * con la service role key.
 */

type Funciones = Database["public"]["Functions"];
type NombreRpc = keyof Funciones;
type ArgsSinActor<N extends NombreRpc> = Omit<Funciones[N]["Args"], "p_actor_id" | "p_actor">;
type RetornoRpc<N extends NombreRpc> = Funciones[N]["Returns"];

/**
 * Ejecuta una RPC de escritura como el administrador con sesión. Verifica la
 * sesión, inyecta su id como actor y traduce los errores de Postgres a
 * mensajes que el cliente entiende.
 */
export async function ejecutarRpc<N extends NombreRpc>(
  nombre: N,
  args: ArgsSinActor<N>,
): Promise<RetornoRpc<N>> {
  const { usuario } = await exigirAdmin();
  const supabase = crearClienteAdmin();

  // transicionar_pedido nombra el actor `p_actor`; el resto, `p_actor_id`.
  const conActor =
    nombre === "transicionar_pedido"
      ? { ...args, p_actor: usuario.id }
      : { ...args, p_actor_id: usuario.id };

  const { data, error } = await supabase.rpc(
    nombre,
    conActor as Funciones[N]["Args"],
  );

  if (error) throw traducirErrorPostgres(error);
  return data as RetornoRpc<N>;
}

/**
 * Rutas públicas que dependen de cada entidad. Tras escribir se revalidan
 * todas: si el admin cambia un precio y la tienda sigue mostrando el viejo,
 * para él el sistema está roto.
 */
const RUTAS_POR_ENTIDAD = {
  documento: ["/matriculas"],
  nivel: ["/", "/semilleros"],
  competencia: ["/", "/competencias"],
  producto: ["/", "/tienda"],
  pedido: [],
} as const;

export type EntidadRevalidable = keyof typeof RUTAS_POR_ENTIDAD;

export function revalidarPublico(entidad: EntidadRevalidable, extra: string[] = []) {
  for (const ruta of [...RUTAS_POR_ENTIDAD[entidad], ...extra]) revalidatePath(ruta);
}

type ErrorPostgres = { code?: string; message?: string; details?: string; hint?: string };

type Traduccion = { mensaje: string; tipo: "validacion" | "conflicto" };

const validacion = (mensaje: string): Traduccion => ({ mensaje, tipo: "validacion" });
const conflicto = (mensaje: string): Traduccion => ({ mensaje, tipo: "conflicto" });

/**
 * Constraints con nombre propio que un formulario del panel puede pisar, con
 * su mensaje. Lista blanca: solo entran nombres leídos de las migraciones.
 * Cubre CHECK (23514) y UNIQUE (23505); un constraint con nombre que no esté
 * aquí cae al genérico de su código.
 *
 * Casi todos ya los cubre Zod antes de llegar a la base. No es razón para
 * dejarlos fuera: es la razón por la que casi nunca se ven. El día que una
 * regla de Zod se desincronice del esquema, esta tabla es la diferencia entre
 * un mensaje útil y "algún dato no cumple las reglas".
 *
 * Fuera a propósito: `transaccion_wompi_id_unico`. Es el mecanismo de
 * idempotencia del webhook de Wompi: que salte es el sistema funcionando, no
 * un fallo. El webhook debe tratarlo como "ya procesado" y responder 200,
 * nunca traducirlo a un mensaje de cara al usuario. También fuera los
 * constraints de `documento_version_*`, `pedido_*` y `contador_*` que solo
 * pisan RPC internas o el checkout, y los índices únicos que un trigger ya
 * impide violar (`competencia_destacada_unica`, `documento_version_una_vigente`).
 */
const MENSAJE_POR_CONSTRAINT: Record<string, Traduccion> = {
  // --- CHECK (23514) ---------------------------------------------------------
  // migración 02: catálogo
  producto_slug_formato: validacion("Solo minúsculas, números y guiones en el slug."),
  producto_nombre_no_vacio: validacion("El nombre no puede quedar vacío."),
  nivel_nombre_no_vacio: validacion("El nombre no puede quedar vacío."),
  variante_precio_positivo: validacion("El precio debe ser mayor que cero."),
  variante_stock_no_negativo: validacion("El stock no puede ser negativo."),
  variante_reservado_menor_que_stock: conflicto(
    "No se puede dejar el stock por debajo de las unidades ya reservadas en pedidos pendientes.",
  ),
  // migración 03: documentos
  documento_titulo_no_vacio: validacion("El título no puede quedar vacío."),
  // migración 04: contenido
  competencia_slug_formato: validacion("Solo minúsculas, números y guiones en el slug."),
  competencia_titulo_no_vacio: validacion("El título no puede quedar vacío."),
  resultado_rider_no_vacio: validacion("El rider es obligatorio."),
  resultado_categoria_no_vacia: validacion("La categoría es obligatoria."),
  resultado_puesto_positivo: validacion("El puesto empieza en 1."),
  // migración 11
  competencia_imagen_requiere_autorizacion: validacion(
    "Esta competencia tiene foto: quítala antes de retirar la autorización.",
  ),

  // --- UNIQUE (23505) --------------------------------------------------------
  // migración 02: catálogo
  producto_slug_unico: validacion("Ya existe otro producto con ese slug. Cambia el slug."),
  nivel_orden_unico: conflicto("Ya hay un nivel con ese orden. Recarga la página e inténtalo de nuevo."),
  variante_talla_unica_por_producto: validacion("Ese producto ya tiene una variante con esa talla."),
  variante_sku_unico: validacion("Ese SKU ya lo usa otra variante. Déjalo vacío o cambia el código."),
  // migración 03: documentos
  documento_version_unica: conflicto("Esa versión ya existe. Recarga la página e inténtalo de nuevo."),
  // migración 04: contenido
  competencia_slug_unico: validacion("Ya existe otra competencia con ese slug. Cambia el slug."),
  // migración 05: pedidos
  pedido_item_variante_unica: conflicto("Ese pedido ya tiene una línea con esa variante."),
};

/**
 * Nombre del constraint que Postgres cita en el mensaje de una violación:
 *   new row for relation "x" violates check constraint "nombre"
 *   duplicate key value violates unique constraint "nombre"
 * PostgREST no expone el nombre en un campo aparte, solo dentro del mensaje.
 * Un `raise exception` nuestro con errcode check_violation no trae esa frase,
 * y así se distinguen los dos casos.
 */
function nombreDeConstraint(mensaje: string): string | null {
  return /violates (?:check|unique) constraint "([^"]+)"/.exec(mensaje)?.[1] ?? null;
}

function errorDeTraduccion(traduccion: Traduccion): ErrorApp {
  return traduccion.tipo === "validacion"
    ? new ErrorValidacion(traduccion.mensaje)
    : new ErrorConflicto(traduccion.mensaje);
}

/**
 * Del código SQLSTATE al mensaje en español.
 *
 * Los constraints con nombre se resuelven por la lista blanca de arriba, no
 * por regex sobre el texto del mensaje. Los `raise exception` de nuestras RPC
 * ya llegan en español y bien redactados: se devuelven tal cual. Lo demás sale
 * como genérico y se registra sin `details`: en un CHECK de `pedido`, Postgres
 * pone ahí "Failing row contains (…)" con los datos de contacto del comprador.
 */
export function traducirErrorPostgres(error: ErrorPostgres): ErrorApp {
  const mensaje = error.message ?? "";

  switch (error.code) {
    case "23503": // foreign_key_violation
      if (/no existe/i.test(mensaje)) return new ErrorNoEncontrado("El registro que intentas editar ya no existe.");
      return new ErrorConflicto(
        "No se puede eliminar: hay registros que dependen de este. Desactívalo en vez de borrarlo.",
      );

    case "23505": {
      // unique_violation: siempre cita el constraint. Sin entrada en la lista
      // blanca —transaccion_wompi_id_unico incluido, ver arriba— va el genérico.
      const nombre = nombreDeConstraint(mensaje);
      const traducido = nombre === null ? undefined : MENSAJE_POR_CONSTRAINT[nombre];
      if (traducido) return errorDeTraduccion(traducido);
      console.error("[rpc] unique sin traducción:", nombre);
      return new ErrorConflicto("Ya existe un registro con esos datos.");
    }

    case "23514": {
      // check_violation llega por dos caminos:
      //  · un CHECK de la tabla: el mensaje cita el nombre del constraint y
      //    se busca en la lista blanca;
      //  · un `raise exception … using errcode = 'check_violation'` de una RPC
      //    nuestra (transicionar_pedido, reordenar_niveles, publicar_competencia…):
      //    no cita constraint y el mensaje ya está en español, bien redactado.
      //    Se devuelve tal cual, sin enmascararlo con el genérico.
      const nombre = nombreDeConstraint(mensaje);
      if (nombre === null) {
        return new ErrorConflicto(mensaje || "La base de datos rechazó la operación.");
      }
      const traducido = MENSAJE_POR_CONSTRAINT[nombre];
      if (traducido) return errorDeTraduccion(traducido);
      console.error("[rpc] check sin traducción:", nombre);
      return new ErrorValidacion("Algún dato no cumple las reglas del esquema: revisa los campos.");
    }

    case "P0001": // raise exception de las funciones de negocio
      if (/inmutable|no se puede modificar/i.test(mensaje)) {
        return new ErrorConflicto("Una versión publicada no se puede editar. Publica una versión nueva.");
      }
      if (/transici|estado/i.test(mensaje)) {
        return new ErrorConflicto("Ese cambio de estado no está permitido desde el estado actual.");
      }
      if (/stock|inventario/i.test(mensaje)) {
        return new ErrorConflicto("No hay inventario suficiente para esa operación.");
      }
      return new ErrorConflicto(mensaje || "La base de datos rechazó la operación.");

    default:
      console.error("[rpc]", { code: error.code, message: mensaje, hint: error.hint });
      return new ErrorApp("No se pudo guardar. Inténtalo de nuevo en un momento.", "interno", 500);
  }
}
