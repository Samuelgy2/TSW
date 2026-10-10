/**
 * Comprueba QUÉ VIAJA al navegador en las rutas públicas, no qué se ve.
 *
 * Dos cosas se ocultan hoy en el sitio, y ocultarlas al pintar no basta:
 *
 * - **Los precios.** La tienda está en modo catálogo porque la cliente todavía
 *   no fijó los precios. Si la consulta los trae, van en el payload RSC y se
 *   leen en el código fuente de la página: cifras publicadas sin querer.
 * - **El NIT.** Su dígito de verificación está sin confirmar contra el RUT.
 *
 * Por eso esto pide las páginas de verdad y busca en el HTML completo —payload
 * incluido—, en vez de mirar el árbol de componentes. No hace falta Chrome: lo
 * que se comprueba es el texto de la respuesta.
 *
 * El chequeo se adapta al estado de los dos interruptores: con
 * `TIENDA_MUESTRA_PRECIOS` en true exige que el precio SÍ llegue, y con
 * `nitConfirmado` en true exige que el NIT SÍ aparezca en el pie y en las tres
 * páginas legales. Así sirve en los dos estados y no hay que recordar cambiarlo
 * el día que se enciendan.
 *
 * Uso: PUERTO=3312 node scripts/verificar-payload.mjs
 */
import process from "node:process";

import { apagarAlRecibirSenal, apagarServidor, encenderServidor } from "./_servidor.mjs";

const PUERTO = process.env.PUERTO ?? "3312";
const BASE = `http://localhost:${PUERTO}`;

/**
 * Los interruptores se leen del archivo, no se importan: este script es .mjs y
 * `src/config/sitio.ts` es TypeScript. Leer el texto evita arrastrar tsx aquí, y
 * de paso falla ruidosamente si alguien renombra la constante.
 */
import { readFileSync } from "node:fs";

const configuracion = readFileSync("src/config/sitio.ts", "utf8");

function leerBooleano(nombre) {
  const encontrado = configuracion.match(new RegExp(`${nombre}\\s*[:=]\\s*(true|false)`));
  if (!encontrado) throw new Error(`No se encontró ${nombre} en src/config/sitio.ts.`);
  return encontrado[1] === "true";
}

function leerTexto(nombre) {
  const encontrado = configuracion.match(new RegExp(`${nombre}\\s*:\\s*"([^"]+)"`));
  if (!encontrado) throw new Error(`No se encontró ${nombre} en src/config/sitio.ts.`);
  return encontrado[1];
}

const MUESTRA_PRECIOS = leerBooleano("TIENDA_MUESTRA_PRECIOS");
const LEGALES_APROBADAS = leerBooleano("LEGALES_APROBADAS");
const NIT_CONFIRMADO = leerBooleano("nitConfirmado");
const NIT = leerTexto("nit");
const NIT_DV = Number(configuracion.match(/nitDv\s*:\s*(\d)/)?.[1]);

/** El NIT completo tal como se publicaría: "902.072.786-0". */
const NIT_PUBLICADO = `${NIT}-${NIT_DV}`;

/** Rutas que llevan producto, y por tanto precios si la tienda los enseña. */
const RUTAS_TIENDA = ["/tienda", "/tienda/uniforme-oficial", "/carrito"];

/** Donde el NIT aparecería si estuviera confirmado. */
const RUTAS_CON_NIT = ["/", "/legal/datos", "/legal/terminos", "/legal/devoluciones", "/legal/cookies"];

/** Las páginas legales. */
const RUTAS_LEGALES = ["/legal/datos", "/legal/terminos", "/legal/devoluciones", "/legal/cookies"];

/** El aviso de borrador, tal como lo escribe la plantilla. */
const AVISO_BORRADOR = "Borrador pendiente de revisión legal";

/** Todas las públicas, para la comprobación en negativo del NIT. */
const RUTAS_PUBLICAS = [
  "/",
  "/semilleros",
  "/competencias",
  "/matriculas",
  "/tienda",
  "/tienda/uniforme-oficial",
  "/carrito",
  "/legal/datos",
  "/legal/terminos",
  "/legal/devoluciones",
  "/legal/cookies",
];

const cache = new Map();

async function pedir(ruta) {
  if (cache.has(ruta)) return cache.get(ruta);
  const respuesta = await fetch(`${BASE}${ruta}`);
  if (!respuesta.ok) throw new Error(`${ruta} devolvió ${respuesta.status}.`);
  const html = await respuesta.text();
  cache.set(ruta, html);
  return html;
}

const fallos = [];

function comprobar(nombre, condicion, detalle = "") {
  if (condicion) {
    console.log(`  OK    ${nombre}`);
  } else {
    fallos.push(nombre);
    console.log(` FALLA  ${nombre}${detalle ? `\n        ${detalle}` : ""}`);
  }
}

const servidor = await encenderServidor(PUERTO);
apagarAlRecibirSenal(servidor);

try {
  console.log("");
  console.log(
    `Interruptores: TIENDA_MUESTRA_PRECIOS=${MUESTRA_PRECIOS}, nitConfirmado=${NIT_CONFIRMADO}, ` +
      `LEGALES_APROBADAS=${LEGALES_APROBADAS}`,
  );
  console.log("");

  // --- Precios ------------------------------------------------------------
  for (const ruta of RUTAS_TIENDA) {
    const html = await pedir(ruta);
    const trae = /precio_centavos/.test(html);

    if (MUESTRA_PRECIOS) {
      // /carrito no consulta nada en servidor: sus items viven en localStorage.
      if (ruta === "/carrito") continue;
      comprobar(`${ruta}: el payload trae precio_centavos, como debe con precios encendidos`, trae);
    } else {
      const muestra = trae ? html.match(/.{0,40}precio_centavos.{0,40}/)?.[0] : "";
      comprobar(
        `${ruta}: el payload NO trae precio_centavos`,
        !trae,
        muestra && `encontrado: …${muestra}…`,
      );
    }
  }

  // Cifras con formato de moneda en el texto visible, que es la otra mitad: un
  // precio podría llegar pintado sin que la palabra precio_centavos aparezca.
  if (!MUESTRA_PRECIOS) {
    for (const ruta of RUTAS_TIENDA) {
      const html = await pedir(ruta);
      // Intl pone un espacio duro tras el signo: "$ 45.000" sale como "$&nbsp;45.000".
      const moneda = html.match(/\$(?:&nbsp;|\s|&#x27;)\s*\d[\d.,]*/);
      comprobar(`${ruta}: ningún importe con signo de peso en el HTML`, !moneda, moneda?.[0]);
    }
  }

  // --- Páginas legales sin aprobar -----------------------------------------
  //
  // Dos cosas juntas, porque cada una sola no basta: el aviso le dice a quien
  // llega que el texto no es definitivo, y el `noindex` evita que sea el
  // resultado que un comprador encuentre en Google. Un texto legal sin revisar
  // indexado es un documento que obliga y que nadie aprobó.
  for (const ruta of RUTAS_LEGALES) {
    const html = await pedir(ruta);
    const tieneAviso = html.includes(AVISO_BORRADOR);
    const tieneNoindex = /<meta name="robots"[^>]*noindex/i.test(html);

    if (LEGALES_APROBADAS) {
      comprobar(`${ruta}: aprobada, sin aviso de borrador`, !tieneAviso);
      comprobar(`${ruta}: aprobada, indexable`, !tieneNoindex);
    } else {
      comprobar(`${ruta}: sin aprobar, avisa que es borrador`, tieneAviso);
      comprobar(
        `${ruta}: sin aprobar, lleva noindex`,
        tieneNoindex,
        tieneNoindex ? "" : html.match(/<meta name="robots"[^>]*>/i)?.[0] ?? "no hay meta robots",
      );
    }
  }

  // --- NIT ----------------------------------------------------------------
  if (NIT_CONFIRMADO) {
    for (const ruta of RUTAS_CON_NIT) {
      const html = await pedir(ruta);
      comprobar(`${ruta}: publica el NIT ${NIT_PUBLICADO}`, html.includes(NIT_PUBLICADO));
    }
  } else {
    for (const ruta of RUTAS_PUBLICAS) {
      const html = await pedir(ruta);
      // Ni el NIT completo ni el número a secas: si sale el número, el dígito
      // sin confirmar es lo de menos, el dato ya está publicado.
      const base = NIT.replace(/\./g, "");
      const aparece = html.includes(NIT_PUBLICADO) || html.includes(NIT) || html.includes(base);
      comprobar(`${ruta}: no publica el NIT mientras no esté confirmado`, !aparece);
    }
  }
} finally {
  apagarServidor(servidor);
}

console.log("");
console.log(`Comprobaciones fallidas: ${fallos.length}`);
console.log("");
if (fallos.length > 0) process.exit(1);
console.log("VERIFICACIÓN LIMPIA: el payload público no lleva lo que está oculto.");
