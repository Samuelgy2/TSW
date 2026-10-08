// Falla si un archivo rastreado por git lleva un secreto con forma real.
//
// Nació de un caso real: la API key de Resend quedó escrita en `.env.example`
// y estuvo a un `git push` de GitHub (lo frenó el escaneo de GitHub, no
// nosotros). Esto es la barrera propia, antes de que el commit exista.
//
// Uso:
//   node scripts/verificar-secretos.mjs            archivos rastreados, tal como están en disco
//   node scripts/verificar-secretos.mjs --staged   lo que está en staging (lo usa el hook)
//
// NUNCA imprime un valor: solo archivo:línea, tipo, 4 primeros caracteres y longitud.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const SOLO_STAGING = process.argv.includes("--staged");
const LIMITE_BYTES = 1_000_000;
const BINARIOS = /\.(png|jpe?g|gif|webp|avif|ico|pdf|woff2?|ttf|eot|mp4|zip|lock)$/i;
const IGNORADOS = /^(node_modules|\.next[^/]*)\//;

/** Marca de valor ficticio: lo que un `.env.example` legítimo contiene. */
const MARCADOR = /ejemplo|example|\btu_|\bTU_|PEGA|aleatoria|xxx/i;
/** Para los patrones de forma real basta lo inequívoco: "xxx" o "PEGA" podrían caer por azar dentro de una clave verdadera. */
const MARCADOR_ESTRICTO = /ejemplo|example/i;

const PATRONES = [
  { tipo: "API key de Resend (re_)", re: /\bre_[A-Za-z0-9_]{20,}/g },
  { tipo: "JWT (eyJ…, clave de Supabase)", re: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, minimo: 100 },
  { tipo: "clave secreta (sk_live_/sk_test_)", re: /\bsk_(?:live|test)_[A-Za-z0-9]{10,}/g },
  { tipo: "clave secreta de Supabase (sb_secret_)", re: /\bsb_secret_[A-Za-z0-9_-]{10,}/g },
  { tipo: "clave privada (BEGIN … PRIVATE KEY)", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
];

/**
 * Falsos positivos conocidos. Cada excepción necesita su motivo: una lista sin
 * explicar se convierte en el sitio donde se esconde el siguiente secreto.
 * `archivo` es la ruta exacta; `contiene`, un texto que debe estar en la línea.
 */
const EXCEPCIONES = [
  // (vacía a propósito: el primer escaneo de todo el historial no encontró ninguno)
];

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28 });

const archivos = SOLO_STAGING
  ? git("diff", "--cached", "--name-only", "--diff-filter=ACM", "-z").split("\0").filter(Boolean)
  : git("ls-files", "-z").split("\0").filter(Boolean);

const leer = (f) => (SOLO_STAGING ? git("show", `:${f}`) : fs.readFileSync(f, "utf8"));
const excepcion = (f, linea) => EXCEPCIONES.some((e) => e.archivo === f && linea.includes(e.contiene));
const resumen = (v) => `${v.slice(0, 4)}… (${v.length} car.)`;

const hallazgos = [];

for (const f of archivos) {
  if (BINARIOS.test(f) || IGNORADOS.test(f)) continue;
  let texto;
  try {
    if (!SOLO_STAGING && fs.statSync(f).size > LIMITE_BYTES) continue;
    texto = leer(f);
  } catch {
    continue; // borrado o ilegible: no hay nada que escanear
  }
  if (texto.length > LIMITE_BYTES) continue;

  const esEjemplo = path.basename(f) === ".env.example";
  texto.split(/\r?\n/).forEach((linea, i) => {
    if (excepcion(f, linea)) return;

    for (const { tipo, re, minimo = 0 } of PATRONES) {
      re.lastIndex = 0;
      for (const m of linea.matchAll(re)) {
        if (m[0].length < minimo || MARCADOR_ESTRICTO.test(m[0])) continue;
        hallazgos.push({ f, n: i + 1, tipo, valor: m[0] });
      }
    }

    // `.env.example` es el único archivo donde un valor asignado a una variable
    // sensible tiene que ser visiblemente ficticio (o estar vacío).
    if (esEjemplo) {
      const m = linea.match(/^\s*([A-Z0-9_]*(?:KEY|SECRET|CLAVE|PASSWORD|TOKEN)[A-Z0-9_]*)\s*=\s*(.*)$/);
      const valor = m?.[2].trim().replace(/^["']|["']$/g, "");
      if (m && valor && !MARCADOR.test(valor)) {
        hallazgos.push({ f, n: i + 1, tipo: `valor real en .env.example (${m[1]})`, valor });
      }
    }
  });
}

if (hallazgos.length) {
  console.log("POSIBLES SECRETOS (no se imprime el valor):");
  for (const h of hallazgos) console.log(`  ${h.f}:${h.n}  ${h.tipo}  ${resumen(h.valor)}`);
  console.log(
    `\nFALLO: ${hallazgos.length} hallazgo(s). Quita el valor del archivo (los secretos van en .env.local o en Vercel) y, si ya lo` +
      "\nhabías commiteado, rota la clave. Falso positivo comprobado: añádelo a EXCEPCIONES con su motivo.",
  );
  process.exit(1);
}
console.log(`SECRETOS LIMPIO: ${archivos.length} archivo(s) ${SOLO_STAGING ? "en staging" : "rastreados"}, ningún secreto con forma real.`);
