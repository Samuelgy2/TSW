import "server-only";

import { DEPORTES, MATRICULAS, PORTADA, SEMILLEROS, TIENDA } from "@/config/contenido";
import { crearClientePublico } from "@/lib/supabase/publico";
import {
  esquemaDeportes,
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

export function obtenerDeportes(): Promise<EntradaDeportes> {
  return leerSeccion("deportes", esquemaDeportes, DEPORTES as unknown as EntradaDeportes);
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
