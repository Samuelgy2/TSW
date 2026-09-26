/**
 * Falla si un archivo `"use server"` exporta algo que no sea una función async.
 *
 * Nace de un fallo real en producción. `features/admin/acciones-sitio.ts`
 * terminaba con `export { MIMES_IMAGEN_SITIO, MAXIMO_IMAGEN_SITIO_BYTES }`, un
 * array y un número. Next inserta en todo módulo "use server" una validación que
 * recorre lo exportado y lanza
 *
 *     A "use server" file can only export async functions, found object.
 *
 * al CARGAR el módulo, es decir, en la primera acción que se invoca, antes de
 * `exigirAdmin` y de cualquier otra línea. `tsc`, ESLint y `next build` pasaban
 * limpios; en producción cada escritura de /admin/sitio daba 500 con el mensaje
 * oculto tras un digest.
 *
 * Se lee con el compilador de TypeScript y no con expresiones regulares: una
 * reexportación `export { a, b }` obliga a resolver cada nombre contra su
 * declaración, y eso con regex es la clase de chequeo que pasa en verde sin
 * haber mirado nada.
 *
 * Se corre con `node scripts/verificar-use-server.mjs`.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const RAIZ = "src";

const tieneModificador = (nodo, tipo) => (ts.getModifiers(nodo) ?? []).some((m) => m.kind === tipo);
const esAsync = (nodo) => tieneModificador(nodo, ts.SyntaxKind.AsyncKeyword);
const esExportado = (nodo) => tieneModificador(nodo, ts.SyntaxKind.ExportKeyword);

/** Una expresión que al evaluarse da una función async. */
function esFuncionAsync(expresion) {
  if (!expresion) return false;
  if (ts.isParenthesizedExpression(expresion)) return esFuncionAsync(expresion.expression);
  return (ts.isArrowFunction(expresion) || ts.isFunctionExpression(expresion)) && esAsync(expresion);
}

function esDirectivaUseServer(fuente) {
  const primera = fuente.statements[0];
  return (
    primera !== undefined &&
    ts.isExpressionStatement(primera) &&
    ts.isStringLiteral(primera.expression) &&
    primera.expression.text === "use server"
  );
}

/**
 * Devuelve las exportaciones de un módulo "use server" que NO son funciones
 * async, cada una con su línea. Lista vacía = módulo correcto.
 */
export function exportacionesInvalidas(nombreArchivo, texto) {
  const fuente = ts.createSourceFile(nombreArchivo, texto, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const linea = (nodo) => fuente.getLineAndCharacterOfPosition(nodo.getStart()).line + 1;

  // Declaraciones de primer nivel por nombre, para resolver `export { a }`.
  const locales = new Map();
  for (const s of fuente.statements) {
    if (ts.isFunctionDeclaration(s) && s.name) locales.set(s.name.text, esAsync(s));
    else if (ts.isVariableStatement(s)) {
      for (const d of s.declarationList.declarations) {
        if (ts.isIdentifier(d.name)) locales.set(d.name.text, esFuncionAsync(d.initializer));
      }
    } else if ((ts.isClassDeclaration(s) || ts.isEnumDeclaration(s)) && s.name) {
      locales.set(s.name.text, false);
    }
  }

  const invalidas = [];
  const marcar = (nombre, nodo, motivo) => invalidas.push({ nombre, linea: linea(nodo), motivo });

  for (const s of fuente.statements) {
    if (ts.isFunctionDeclaration(s) && esExportado(s)) {
      if (!esAsync(s)) marcar(s.name?.text ?? "default", s, "función sin async");
    } else if (ts.isVariableStatement(s) && esExportado(s)) {
      for (const d of s.declarationList.declarations) {
        if (!esFuncionAsync(d.initializer)) marcar(d.name.getText(fuente), d, "no es una función async");
      }
    } else if ((ts.isClassDeclaration(s) || ts.isEnumDeclaration(s)) && esExportado(s)) {
      marcar(s.name?.text ?? "default", s, ts.isEnumDeclaration(s) ? "enum" : "clase");
    } else if (ts.isExportAssignment(s)) {
      const e = s.expression;
      const valida = ts.isIdentifier(e) ? locales.get(e.text) === true : esFuncionAsync(e);
      if (!valida) marcar("default", s, "export default que no es función async");
    } else if (ts.isExportDeclaration(s) && !s.isTypeOnly) {
      if (s.moduleSpecifier) {
        marcar(s.exportClause ? s.exportClause.getText(fuente) : "*", s, "reexporta desde otro módulo: no se puede comprobar aquí");
        continue;
      }
      if (!s.exportClause || !ts.isNamedExports(s.exportClause)) continue;
      for (const e of s.exportClause.elements) {
        if (e.isTypeOnly) continue;
        const local = (e.propertyName ?? e.name).text;
        if (locales.get(local) !== true) marcar(e.name.text, e, "no es una función async");
      }
    }
  }
  return invalidas;
}

// ---------------------------------------------------------------------------
// 1. Autocomprobación: el analizador tiene que atrapar el caso que nos tumbó
//    producción, y no marcar un módulo correcto. Si esto falla, un verde abajo
//    no significa nada.
// ---------------------------------------------------------------------------

const resultados = [];
const caso = (ok, nombre, ref, detalle) => resultados.push({ ok, nombre, ref, detalle });

const MALO = `"use server";
const MIMES = ["image/png"] as const;
const MAXIMO = 10;
export { MIMES, MAXIMO };
export const TABLA = { a: 1 };
export function sinAsync() { return 1; }
export enum Color { Azul }
export type Tipo = string;
export async function bien() {}
export const flecha = async () => {};`;

const BUENO = `"use server";
import type { X } from "y";
export type Resultado = { ok: boolean };
export interface Algo { a: number }
async function interna() {}
const otra = async () => {};
export { interna, otra as renombrada };
export async function accion() {}
export const flecha = async (a: number) => a;
export default async function porDefecto() {}`;

const enMalo = exportacionesInvalidas("malo.ts", MALO).map((i) => i.nombre).sort();
const esperado = ["Color", "MAXIMO", "MIMES", "TABLA", "sinAsync"];
caso(
  JSON.stringify(enMalo) === JSON.stringify(esperado),
  "autocomprobación: atrapa array, número, objeto, función sin async y enum",
  "—",
  `marcó: ${enMalo.join(", ") || "nada"}`,
);
const enBueno = exportacionesInvalidas("bueno.ts", BUENO);
caso(enBueno.length === 0, "autocomprobación: no marca tipos, reexportaciones de async ni default async", "—", enBueno.map((i) => i.nombre).join(", ") || undefined);

// ---------------------------------------------------------------------------
// 2. Los archivos reales. Se recorre el disco, no `git ls-files`: un archivo
//    nuevo sin añadir al índice también se despliega si alguien hace commit -a.
// ---------------------------------------------------------------------------

const archivos = readdirSync(RAIZ, { recursive: true })
  .map((f) => path.join(RAIZ, String(f)))
  .filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith(".d.ts"));

let conDirectiva = 0;
for (const archivo of archivos) {
  const texto = readFileSync(archivo, "utf8");
  if (!texto.includes("use server")) continue;
  const fuente = ts.createSourceFile(archivo, texto, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (!esDirectivaUseServer(fuente)) continue;
  conDirectiva += 1;

  const relativo = archivo.split(path.sep).join("/");
  const invalidas = exportacionesInvalidas(archivo, texto);
  if (invalidas.length === 0) caso(true, `${relativo}: solo exporta funciones async`, relativo);
  for (const i of invalidas) caso(false, `${relativo}: exporta "${i.nombre}"`, `${relativo}:${i.linea}`, i.motivo);
}

// Cero archivos es un fallo, no un verde: significaría que el recorrido no miró nada.
caso(conDirectiva > 0, "se encontraron módulos \"use server\"", "—", `${conDirectiva} archivos`);

// ---------------------------------------------------------------------------
// 3. Reporte
// ---------------------------------------------------------------------------

console.log("");
const ancho = Math.max(...resultados.map((r) => r.nombre.length));
let fallas = 0;
for (const r of resultados) {
  if (!r.ok) fallas += 1;
  console.log(`${r.ok ? "  OK  " : " FALLA"}  ${r.nombre.padEnd(ancho)}  ${r.ref}${r.detalle ? `  (${r.detalle})` : ""}`);
}
console.log("");
console.log(`Casos: ${resultados.length}, fallidos: ${fallas}`);
console.log("");

if (fallas > 0) {
  console.log("HAY DISCREPANCIAS: un archivo \"use server\" exporta algo que no es una función");
  console.log("async. Next lo rechaza al cargar el módulo, en la primera acción invocada, y en");
  console.log("producción solo se ve un 500 con digest. Mueve las constantes a un módulo normal.");
  process.exit(1);
}

console.log("VALIDACIÓN LIMPIA");
console.log("");
console.log("Sin verificar de forma mecánica:");
console.log("  · Las funciones marcadas con \"use server\" DENTRO de otra función (acciones en");
console.log("    línea). Aquí solo se mira la directiva al inicio del archivo.");
console.log("  · Que un valor asignado a una variable sea una función async si viene de otra");
console.log("    expresión (`export const x = envolver(y)`): se marca como inválido aunque");
console.log("    en ejecución resultara ser una función.");
