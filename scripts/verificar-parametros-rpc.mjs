/**
 * Cruza cada llamada `ejecutarRpc("x", { … })` contra la firma real de la RPC
 * en las migraciones, y avisa si falta un parámetro que la función exige.
 *
 * Nace de un fallo real. `guardar_nivel` ganó `p_club_id` en la migración 17,
 * declarado como `p_club_id uuid default null` —como todos los parámetros de
 * esa familia de RPC—. El tipo que genera Supabase lo marca opcional porque
 * TIENE un DEFAULT, así que el build pasaba limpio con la acción sin mandarlo.
 * El cuerpo, en cambio, empieza con:
 *
 *     if p_club_id is null then
 *       raise exception 'Falta el club del nivel.'
 *
 * Es decir: obligatorio de hecho, opcional a ojos del tipo. Cada guardado de
 * nivel habría muerto en ejecución. Un DEFAULT en la firma no dice que el
 * parámetro sea opcional, solo que se puede omitir al llamar.
 *
 * Qué cuenta como obligatorio aquí, y por qué se puede saber sin ejecutar
 * plpgsql:
 *
 *   · Parámetros SIN default: obligatorios para Postgres.
 *   · Parámetros CON default cuyo cuerpo hace `if p_x is null then … raise`:
 *     obligatorios de hecho. Ese patrón sí es reconocible con una expresión
 *     regular, al revés que la semántica general de plpgsql.
 *
 * `p_actor_id` y `p_actor` quedan fuera: los inyecta `ejecutarRpc` con el id
 * de la sesión, y por eso ninguna acción los escribe.
 *
 * Se corre con `node scripts/verificar-parametros-rpc.mjs`.
 */
import { readFileSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";

const DIR = "supabase/migrations";
const INYECTADOS = new Set(["p_actor_id", "p_actor"]);

/**
 * Parámetros de RPC de reemplazo total que, aunque tengan DEFAULT y el cuerpo
 * no los exija, la acción debe escribir SIEMPRE: omitirlos equivale a null y
 * borra el dato. `p_deporte_id` (migración 23): omitirlo quitaba la etiqueta de
 * deporte del slide en cada edición.
 */
const SIEMPRE = { guardar_slide_carrusel: ["p_deporte_id"] };

const sinComentarios = (t) => t.replace(/--[^\n]*/g, "");

// ---------------------------------------------------------------------------
// 1. Firmas: la ÚLTIMA definición de cada función gana, como en la base.
// ---------------------------------------------------------------------------

const firmas = new Map();

for (const archivo of readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()) {
  const texto = sinComentarios(readFileSync(`${DIR}/${archivo}`, "utf8"));

  for (const m of texto.matchAll(/create\s+or\s+replace\s+function\s+public\.([a-z_]+)\s*\(([\s\S]*?)\)\s*\n\s*returns[\s\S]*?\n\$\$;/gi)) {
    const nombre = m[1];
    const listaCruda = m[2];
    const cuerpo = m[0];

    // Partir por comas de primer nivel: `default '{}'::jsonb` puede traer comas.
    const partes = [];
    let nivel = 0;
    let actual = "";
    for (const c of listaCruda) {
      if (c === "(") nivel += 1;
      else if (c === ")") nivel -= 1;
      if (c === "," && nivel === 0) { partes.push(actual); actual = ""; } else actual += c;
    }
    partes.push(actual);

    const parametros = partes
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const nombreParam = /^([a-z_]+)\s/.exec(p)?.[1];
        const tieneDefault = /\bdefault\b/i.test(p);
        return nombreParam ? { nombre: nombreParam, tieneDefault } : null;
      })
      .filter(Boolean);

    for (const p of parametros) {
      // `if p_x is null then … raise` dentro de los 240 caracteres siguientes.
      const re = new RegExp(`if\\s+${p.nombre}\\s+is\\s+null\\s+then[\\s\\S]{0,240}?raise\\s+exception`, "i");
      p.exigidoEnElCuerpo = re.test(cuerpo);
    }

    const previa = firmas.get(nombre);
    firmas.set(nombre, {
      archivo,
      parametros,
      // Todas las migraciones que la definen, en orden. La última gana, igual
      // que en la base: `create or replace` reemplaza a la anterior.
      definidaEn: [...(previa?.definidaEn ?? []), archivo.slice(0, 8)],
    });
  }
}

// ---------------------------------------------------------------------------
// 2. Llamadas desde las acciones.
// ---------------------------------------------------------------------------

const archivosFuente = execSync("git ls-files src", { encoding: "utf8" })
  .trim().split("\n").filter((f) => /\.tsx?$/.test(f));

const llamadas = [];
for (const ruta of archivosFuente) {
  const texto = readFileSync(ruta, "utf8");
  for (const m of texto.matchAll(/ejecutarRpc\(\s*"([a-z_]+)"\s*,\s*\{([\s\S]*?)\}\s*\)/g)) {
    const claves = [...m[2].matchAll(/(?:^|[\s{,])(p_[a-z_]+)\s*:/g)].map((c) => c[1]);
    const linea = texto.slice(0, m.index).split(/\r?\n/).length;
    llamadas.push({ ruta: ruta.replace("src/", ""), linea, funcion: m[1], claves });
  }
}

// ---------------------------------------------------------------------------
// 3. El cruce.
// ---------------------------------------------------------------------------

const resultados = [];
const verificar = (nombre, ok, ref, detalle = "") => resultados.push({ nombre, ok, ref, detalle });

verificar("se leyeron firmas de las migraciones", firmas.size > 20, "—", `${firmas.size} funciones`);
verificar("se encontraron llamadas en el código", llamadas.length > 20, "—", `${llamadas.length} llamadas`);

for (const llamada of llamadas) {
  const firma = firmas.get(llamada.funcion);
  const ref = `${llamada.ruta}:${llamada.linea}`;

  if (!firma) {
    verificar(`${llamada.funcion}: existe en alguna migración`, false, ref, "no se encontró su definición");
    continue;
  }

  const obligatorios = firma.parametros
    .filter((p) => !INYECTADOS.has(p.nombre))
    .filter((p) => !p.tieneDefault || p.exigidoEnElCuerpo || SIEMPRE[llamada.funcion]?.includes(p.nombre));

  const faltan = obligatorios.filter((p) => !llamada.claves.includes(p.nombre));

  verificar(
    `${llamada.funcion}: manda lo que la RPC exige`,
    faltan.length === 0,
    ref,
    faltan.length
      ? `falta ${faltan.map((p) => p.nombre + (p.tieneDefault ? " (tiene DEFAULT, pero el cuerpo lo exige)" : " (sin default)")).join(", ")}`
      : obligatorios.length
        ? `obligatorios: ${obligatorios.map((p) => p.nombre).join(", ")}`
        : "todos sus parámetros son opcionales de verdad",
  );

  // El error simétrico: un parámetro que la RPC no declara. PostgREST resuelve
  // la sobrecarga por el conjunto de claves del cuerpo, así que uno de más
  // significa "no existe esa función" y responde 404 (PGRST202) en ejecución.
  // Pasa al renombrar un parámetro en una migración y dejar el nombre viejo en
  // la acción: el tipo generado lo marca como error, salvo que el objeto se
  // arme con un spread, que es justo lo que hace ejecutarRpc.
  const declarados = new Set(firma.parametros.map((p) => p.nombre));
  const sobran = llamada.claves.filter((c) => !declarados.has(c));
  verificar(
    `${llamada.funcion}: no manda parámetros que la RPC no declara`,
    sobran.length === 0,
    ref,
    sobran.length ? `sobra ${sobran.join(", ")} -> PostgREST no encuentra la función (404)` : "",
  );
}

// Si una RPC se redefine, el cruce usa la ÚLTIMA firma, como la base.
for (const [nombre, firma] of firmas) {
  if (firma.definidaEn.length < 2) continue;
  verificar(
    `${nombre}: se cruza contra la última de sus ${firma.definidaEn.length} definiciones`,
    firma.archivo.slice(0, 8) === firma.definidaEn.at(-1),
    firma.archivo.slice(0, 8),
    `definida en ${firma.definidaEn.join(" -> ")}; gana ${firma.definidaEn.at(-1)}`,
  );
}

// ---------------------------------------------------------------------------
// Reporte
// ---------------------------------------------------------------------------

const ancho = Math.max(...resultados.map((r) => r.nombre.length));
let fallas = 0;
console.log("");
for (const r of resultados) {
  if (!r.ok) fallas += 1;
  console.log(`${r.ok ? "  OK  " : " FALLA"}  ${r.nombre.padEnd(ancho)}  ${r.ref}${r.detalle ? `  (${r.detalle})` : ""}`);
}
console.log("");
console.log(`Casos: ${resultados.length}, fallidos: ${fallas}`);
console.log("");

if (fallas > 0) {
  console.log("HAY DISCREPANCIAS: una acción llama a una RPC sin un parámetro que la función");
  console.log("exige. Con DEFAULT en la firma, el tipo generado lo da por opcional y el build");
  console.log("pasa: el fallo aparece en ejecución.");
  process.exit(1);
}

console.log("VALIDACIÓN LIMPIA");
console.log("");
console.log("Sin verificar de forma mecánica:");
console.log("  · Que el VALOR que se manda sea el correcto. Esto mira que el parámetro esté,");
console.log("    no que lleve el id que toca.");
console.log("  · Los parámetros que el cuerpo exige de otra forma: un `coalesce` que revienta");
console.log("    más abajo, o una condición repartida en varias ramas. Solo se reconoce el");
console.log("    patrón `if p_x is null then … raise`.");
console.log("  · Las llamadas que no pasan por ejecutarRpc. Hoy no hay ninguna: la regla del");
console.log("    proyecto es que toda escritura del panel vaya por ahí.");
