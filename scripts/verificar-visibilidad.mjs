// El contenido nunca puede depender de una animación para ser visible.
//
// Nació de un fallo real en producción: navegando por clic (no con F5), `main`
// quedaba en blanco —un div con `opacity: 0` en línea que envolvía la página—.
// Un build limpio y un 360px sin overflow no lo ven: la página existe, solo que
// transparente, y solo ocurre en navegación del lado del cliente.
//
// Recorre TODAS las rutas públicas alcanzables por enlace (menú, submenú de
// Clubes, pie, un producto de la tienda), con `prefers-reduced-motion` en
// `reduce` y en `no-preference`. En cada una:
//   1. llega por clic desde otra página,
//   2. 5 clics rápidos seguidos al mismo enlace,
//   3. alterna rápido con otra página y termina en ella.
// Tras 1 s exige 0 elementos con opacidad efectiva 0 DENTRO del viewport (lo
// que está bajo el pliegue y espera al scroll es legítimo) y el h1 visible.
//
// Uso: PUERTO=3312 node scripts/verificar-visibilidad.mjs
//      MODO=start para probar un build de producción (.next-verificar).
import fs from "node:fs";
import process from "node:process";

import { abrirPestana, encenderChrome, perfil } from "./_chrome.mjs";
import { apagarAlRecibirSenal, apagarServidor, encenderServidor, esperar } from "./_servidor.mjs";

const PUERTO = process.env.PUERTO ?? "3312";
const BASE = `http://localhost:${PUERTO}`;
const ASENTAR_MS = 1000; // el criterio: tras 1 s, todo visible
const RAPIDO_MS = 60; // entre clics seguidos

/** Rutas que no son del sitio público de cara al visitante. */
const EXCLUIDAS = /^\/(admin|cuenta|api|laboratorio)(\/|$)/;
const ES_PRODUCTO = /^\/tienda\/[^/?]+$/;

// Opacidad efectiva: la propia por la de cada ancestro, porque un padre en 0
// oculta a todos sus hijos aunque ellos computen 1. Solo cuenta lo que cae
// dentro del viewport.
const SONDA = `(function () {
  var efectiva = function (el) {
    var o = 1;
    for (var n = el; n && n !== document.body; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity);
    return o;
  };
  var malos = [];
  var todos = document.querySelectorAll('main, main *');
  for (var i = 0; i < todos.length; i++) {
    var el = todos[i];
    if (!el.textContent.trim()) continue;
    var r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.top >= window.innerHeight) continue;
    // Ocultos a propósito con la utilidad (flechas del carrusel: aparecen al enfocar).
    // El opacity:0 en línea de una animación NO se exime.
    if (el.closest('[aria-hidden="true"], .opacity-0')) continue;
    if (efectiva(el) < 0.01 && malos.length < 3) {
      malos.push(el.tagName + ' style="' + (el.getAttribute('style') || '') + '"');
    }
  }
  var h1 = document.querySelector('main h1');
  var h1ok = !!h1 && h1.getBoundingClientRect().height > 0 && efectiva(h1) > 0.99;
  return JSON.stringify({ malos: malos, h1: h1ok, ruta: location.pathname + location.search });
})()`;

const ABRIR_CLUBES = `(function () {
  var b = Array.from(document.querySelectorAll('header button')).find(function (x) { return /clubes/i.test(x.textContent); });
  if (b) b.click();
})()`;

/** Clic en un enlace; si no está en el DOM abre «Clubes» (el submenú solo existe abierto). */
const clicEnlace = (ruta) => `(async function () {
  var selector = 'a[href=' + JSON.stringify(${JSON.stringify(ruta)}) + ']';
  var a = document.querySelector(selector);
  if (!a) {
    ${ABRIR_CLUBES}
    await new Promise(function (r) { setTimeout(r, 400); });
    a = document.querySelector(selector);
  }
  if (!a) return false;
  a.click();
  return true;
})()`;

const ENLACES = `JSON.stringify(Array.from(document.querySelectorAll('header a[href^="/"], footer a[href^="/"], main a[href^="/tienda/"]')).map(function (a) { return a.getAttribute('href'); }))`;

let fallos = 0;
const servidor = await encenderServidor(PUERTO, process.env.MODO ?? "dev");
apagarAlRecibirSenal(servidor);
const chrome = await encenderChrome();
const pesta = await abrirPestana();

const leerEstado = async () => JSON.parse(await pesta.evaluar(SONDA));

/** Espera a que la URL sea la esperada (en dev la primera visita compila). */
async function esperarRuta(destino) {
  for (let i = 0; i < 80 && (await leerEstado()).ruta !== destino; i++) await esperar(500);
}

async function cargar(ruta) {
  await pesta.navegar(`${BASE}${ruta}`);
  await esperarRuta(ruta);
  await esperar(ASENTAR_MS);
}

/** Enlaces internos del menú y el pie, los del submenú de Clubes y un producto de la tienda. */
async function descubrirRutas() {
  const leer = async () => JSON.parse((await pesta.evaluar(ENLACES)) ?? "[]");
  await cargar("/");
  const rutas = new Set(await leer());
  await pesta.evaluar(ABRIR_CLUBES);
  await esperar(500);
  for (const r of await leer()) rutas.add(r);
  await cargar("/tienda");
  const producto = (await leer()).find((r) => ES_PRODUCTO.test(r));
  if (producto) rutas.add(producto);
  return [...rutas].filter((r) => !EXCLUIDAS.test(r) && !r.includes("#"));
}

async function comprobar(modo, ruta, escenario) {
  await esperar(ASENTAR_MS);
  const estado = await leerEstado();
  const problemas = [];
  if (estado.ruta !== ruta) problemas.push(`terminó en ${estado.ruta}`);
  if (estado.malos.length) problemas.push(`INVISIBLE: ${estado.malos.join(" | ")}`);
  if (!estado.h1) problemas.push("h1 no visible");
  if (problemas.length) fallos++;
  console.log(`${modo.padEnd(13)} ${ruta.padEnd(36)} ${escenario.padEnd(11)} -> ${problemas.join(" · ") || "ok"}`);
}

try {
  await pesta.fijarViewport(1280, 900); // el menú de escritorio está a la vista
  await pesta.emularMovimiento(false);
  const rutas = await descubrirRutas();
  console.log(`Rutas públicas: ${rutas.join(", ")}`);

  for (const reducido of [true, false]) {
    const modo = reducido ? "reduce" : "no-preference";
    await pesta.emularMovimiento(reducido);

    for (const ruta of rutas) {
      // El detalle de producto solo se enlaza desde /tienda.
      const otra = ES_PRODUCTO.test(ruta) ? "/tienda" : rutas.find((r) => r !== ruta && !r.startsWith("/semilleros/")) ?? "/";
      const clic = async (r) => (await pesta.evaluar(clicEnlace(r))) === true;

      // 1. Llegar por clic desde otra página.
      await cargar(otra);
      if (!(await clic(ruta))) {
        fallos++;
        console.log(`${modo.padEnd(13)} ${ruta.padEnd(36)} -> ERROR: el enlace no está en el DOM`);
        continue;
      }
      await esperarRuta(ruta);
      await comprobar(modo, ruta, "clic");

      // 2. Cinco clics rápidos al mismo enlace.
      for (let i = 0; i < 5; i++) {
        await clic(ruta);
        await esperar(RAPIDO_MS);
      }
      await comprobar(modo, ruta, "5 clics");

      // 3. Alternar rápido con otra página y terminar en la de prueba.
      await cargar(otra);
      for (const destino of [ruta, otra, ruta, otra, ruta]) {
        await clic(destino);
        await esperar(RAPIDO_MS);
      }
      await esperarRuta(ruta);
      await comprobar(modo, ruta, "alternando");
    }
  }
  await pesta.cerrar();
} finally {
  chrome.kill();
  apagarServidor(servidor);
  try {
    fs.rmSync(perfil, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
  } catch {
    /* perfil residual en %TEMP%, sin efecto en el resultado */
  }
}

if (fallos > 0) {
  console.log(`FALLO: ${fallos} comprobación(es) con contenido invisible, sin h1 o sin enlace.`);
  process.exit(1);
}
console.log("VERIFICACIÓN LIMPIA: contenido y h1 visibles en todas las rutas públicas, con y sin movimiento reducido.");
