/**
 * Utilidades compartidas por los scripts de verificación.
 *
 * Se ejecutan con `npx tsx scripts/<archivo>.ts`. Leen las credenciales de
 * `.env.local` si existe, y si no, de las variables de entorno del proceso.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../src/lib/supabase/database.types";

export type Cliente = SupabaseClient<Database>;

/** Lee .env.local sin depender de dotenv. */
function cargarEnvLocal(): void {
  const ruta = resolve(process.cwd(), ".env.local");
  if (!existsSync(ruta)) return;

  for (const linea of readFileSync(ruta, "utf8").split("\n")) {
    const limpia = linea.trim();
    if (limpia === "" || limpia.startsWith("#")) continue;

    const separador = limpia.indexOf("=");
    if (separador === -1) continue;

    const clave = limpia.slice(0, separador).trim();
    const valor = limpia.slice(separador + 1).trim().replace(/^["']|["']$/g, "");
    if (process.env[clave] === undefined) process.env[clave] = valor;
  }
}

function exigir(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    console.error(`\nFalta la variable ${nombre}.`);
    console.error("Defínela en .env.local o en el entorno antes de correr el script.\n");
    process.exit(2);
  }
  return valor;
}

/**
 * Detecta si una llave es de servicio. Cubre las dos familias: los JWT
 * heredados, cuyo payload trae `role`, y las modernas `sb_secret_...`.
 */
export function esLlaveDeServicio(llave: string): boolean {
  if (llave.startsWith("sb_secret_")) return true;

  const partes = llave.split(".");
  if (partes.length !== 3) return false;

  try {
    const payload = JSON.parse(
      Buffer.from(partes[1] as string, "base64").toString("utf8"),
    ) as { role?: string };
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

export function urlProyecto(): string {
  cargarEnvLocal();
  return exigir("NEXT_PUBLIC_SUPABASE_URL");
}

export function llaveAnon(): string {
  cargarEnvLocal();
  return exigir("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

/** Cliente con la anon key: el que ve el navegador de cualquier visitante. */
export function clienteAnon(): Cliente {
  return createClient<Database>(urlProyecto(), llaveAnon(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Cliente con service role: salta RLS. Solo para conteos de control. */
export function clienteServicio(): Cliente {
  cargarEnvLocal();
  return createClient<Database>(urlProyecto(), exigir("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// --- Reporte ---------------------------------------------------------------

export type Veredicto = "aprobado" | "fallido" | "indeterminado";

export type Resultado = {
  nombre: string;
  veredicto: Veredicto;
  motivo: string;
  grave?: boolean;
};

const SIMBOLO: Record<Veredicto, string> = {
  aprobado: "  OK  ",
  fallido: " FALLA",
  indeterminado: "  ??  ",
};

export class Reporte {
  private readonly resultados: Resultado[] = [];

  registrar(resultado: Resultado): void {
    this.resultados.push(resultado);
    const marca = resultado.grave && resultado.veredicto === "fallido" ? " FALLA GRAVE" : SIMBOLO[resultado.veredicto];
    const motivo = resultado.motivo === "" ? "" : `  — ${resultado.motivo}`;
    console.log(`${marca}  ${resultado.nombre}${motivo}`);
  }

  aprobado(nombre: string, motivo = ""): void {
    this.registrar({ nombre, veredicto: "aprobado", motivo });
  }

  fallido(nombre: string, motivo: string, grave = false): void {
    this.registrar({ nombre, veredicto: "fallido", motivo, grave });
  }

  indeterminado(nombre: string, motivo: string): void {
    this.registrar({ nombre, veredicto: "indeterminado", motivo });
  }

  /** Imprime el conteo y termina el proceso con el código adecuado. */
  cerrar(titulo: string): never {
    const cuenta = (v: Veredicto) => this.resultados.filter((r) => r.veredicto === v).length;
    const aprobados = cuenta("aprobado");
    const fallidos = cuenta("fallido");
    const indeterminados = cuenta("indeterminado");

    console.log("");
    console.log(`${titulo}: ${aprobados} aprobados, ${fallidos} fallidos, ${indeterminados} indeterminados`);

    if (indeterminados > 0) {
      console.log("Los casos indeterminados no prueban nada: no había datos con los que contrastar.");
    }

    process.exit(fallidos > 0 ? 1 : 0);
  }
}

/**
 * Ejecuta algo que debería lanzar, y devuelve el mensaje de error si lo hizo.
 * Recibe PromiseLike porque los constructores de consulta de supabase-js son
 * "thenables", no promesas.
 */
export async function errorDe(operacion: () => PromiseLike<{ error: unknown }>): Promise<string | null> {
  const { error } = await operacion();
  if (!error) return null;
  const mensaje = (error as { message?: string }).message;
  return mensaje ?? JSON.stringify(error);
}
