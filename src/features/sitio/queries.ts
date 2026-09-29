import "server-only";

import { DEPORTES, MATRICULAS, PORTADA, SEMILLEROS, TIENDA } from "@/config/contenido";
import { crearClientePublico } from "@/lib/supabase/publico";
import {
  esquemaMatriculas,
  esquemaPortada,
  esquemaSemilleros,
  esquemaTienda,
  type EntradaDeportes,
  type EntradaMatriculas,
  type EntradaPortada,
  type EntradaSemilleros,
  type EntradaTienda,
} from "./schemas";

/**
 * Capa de lectura de `contenido_sitio` (migración 19): una función por
 * sección, cada una devolviendo SIEMPRE algo válido y renderizable.
 *
 * El contrato: una fila con forma vieja —un campo que un esquema nuevo ya no
 * acepta, una migración de datos que no se corrió— NUNCA rompe una página
 * pública. Se valida con `safeParse`; si falla, se registra el error en el
 * servidor (para que el club o Samuel lo vean en los logs de Vercel) y se
 * devuelve el valor de `config/contenido.ts`, que es código versionado y
 * siempre tiene una forma válida por construcción.
 *
 * Fila AUSENTE no es un error: significa "nadie ha personalizado esta
 * sección todavía", y cae al mismo valor por defecto sin registrar nada.
 *
 * Se lee con `crearClientePublico()` —anon key, sin cookies— igual que el
 * resto de las consultas públicas: esta tabla no tiene lectura distinta por
 * sesión (la política es `using (true)` para cualquiera), así que no hay
 * razón para arrastrar la sesión del panel hasta aquí.
 */
async function leerSeccion<T>(clave: string, esquema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: { message: string } } }, porDefecto: T): Promise<T> {
  try {
    const supabase = crearClientePublico();
    const { data, error } = await supabase
      .from("contenido_sitio")
      .select("valor")
      .eq("clave", clave)
      .maybeSingle();

    if (error) {
      console.error(`[contenido:${clave}] error al leer contenido_sitio, se usa el valor por defecto:`, error.message);
      return porDefecto;
    }

    // Fila ausente = nadie personalizó esta sección. No es un error.
    if (!data) return porDefecto;

    const validado = esquema.safeParse(data.valor);
    if (!validado.success) {
      console.error(
        `[contenido:${clave}] la fila guardada no tiene la forma esperada, se usa el valor por defecto:`,
        validado.error?.message,
      );
      return porDefecto;
    }

    return validado.data as T;
  } catch (error) {
    // Cualquier fallo inesperado —red, el propio Supabase caído— tampoco debe
    // tumbar la página: es exactamente el mismo caso que una fila con forma
    // vieja, visto desde el otro lado.
    console.error(`[contenido:${clave}] fallo inesperado leyendo contenido_sitio, se usa el valor por defecto:`, error);
    return porDefecto;
  }
}

/**
 * Deportes activos, desde la tabla `deporte` (migración 22) y no desde
 * `contenido_sitio`. Misma forma de siempre (`slug` sale como `id`,
 * `imagen_path` como `imagen`), así que el hero, "Nuestros deportes" y los
 * selectores públicos no cambian.
 *
 * Filtra `activo` en la consulta además de la política RLS: las vistas
 * públicas no dependen de la política como única defensa.
 *
 * Si la lectura falla, o no vuelve ninguna fila (la RPC impide desactivar el
 * último, así que vacío solo pasaría por un fallo o una tabla borrada), cae a
 * `DEPORTES` de config/contenido.ts: la portada nunca se queda sin deportes.
 */
export async function obtenerDeportes(): Promise<EntradaDeportes> {
  const respaldo = DEPORTES as unknown as EntradaDeportes;
  try {
    const supabase = crearClientePublico();
    const { data, error } = await supabase
      .from("deporte")
      .select("slug, nombre, categoria, descripcion, puntos, pie, imagen_path")
      .eq("activo", true)
      .order("orden")
      .order("creado_en");

    if (error) {
      console.error("[deporte] error al leer la tabla, se usa el valor de fábrica:", error.message);
      return respaldo;
    }
    if (!data || data.length === 0) {
      console.error("[deporte] la tabla no devolvió deportes activos, se usa el valor de fábrica.");
      return respaldo;
    }

    return data.map((d) => ({
      id: d.slug,
      nombre: d.nombre,
      categoria: d.categoria,
      descripcion: d.descripcion,
      puntos: d.puntos,
      imagen: d.imagen_path,
      pie: d.pie,
    }));
  } catch (error) {
    console.error("[deporte] fallo inesperado leyendo la tabla, se usa el valor de fábrica:", error);
    return respaldo;
  }
}

export function obtenerPortada(): Promise<EntradaPortada> {
  return leerSeccion("portada", esquemaPortada, PORTADA as unknown as EntradaPortada);
}

export function obtenerMatriculas(): Promise<EntradaMatriculas> {
  return leerSeccion("matriculas", esquemaMatriculas, MATRICULAS as unknown as EntradaMatriculas);
}

export function obtenerSemilleros(): Promise<EntradaSemilleros> {
  return leerSeccion("semilleros", esquemaSemilleros, SEMILLEROS as unknown as EntradaSemilleros);
}

export function obtenerTienda(): Promise<EntradaTienda> {
  return leerSeccion("tienda", esquemaTienda, TIENDA as unknown as EntradaTienda);
}
