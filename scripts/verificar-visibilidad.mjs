// El contenido nunca puede depender de una animación para ser visible.
//
// Nació de un fallo real en producción: con `prefers-reduced-motion` activo,
// navegar por clic del menú a /competencias, /matriculas o /tienda dejaba
// `main` invisible (un div con `opacity: 0` en línea) y solo F5 lo arreglaba.
// Un build limpio y un 360px sin overflow no lo ven: la página existe, solo
// que transparente, y solo ocurre en navegación del lado del cliente.
//
// Para cada preferencia de movimiento (reduce y no-preference): carga `/`,
// hace clic en el enlace del menú a cada ruta y, pasada la animación, cuenta
// los elementos de `main` con texto, tamaño y opacidad computada 0. Sale 1 si
// hay alguno. Uso: PUERTO=3312 node scripts/verificar-visibilidad.mjs
import fs from "node:fs";
import process from "node:process";

import { abrirPestana, encenderChrome, perfil } from "./_chrome.mjs";
import { apagarAlRecibirSenal, apagarServidor, encenderServidor, esperar } from "./_servidor.mjs";

const PUERTO = process.env.PUERTO ?? "3312";
const RUTAS = ["/competencias", "/matriculas", "/tienda"];
const ESPERA_ANIMACION_MS = 1500; // transiciones de 0.2-0.4 s más hidratación

// Opacidad efectiva: la propia por la de cada ancestro, porque un padre en 0
// oculta a todos sus hijos aunque ellos computen 1.
const SONDA = `(function () {
  var malos = [];
  var todos = document.querySelectorAll('main, main *');
  for (var i = 0; i < todos.length; i++) {
    var el = todos[i];
    if (!el.textContent.trim()) continue;
    var r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    var efectiva = 1;
    for (var n = el; n && n !== document.body; n = n.parentElement) {
      efectiva *= parseFloat(getComputedStyle(n).opacity);
    }
    if (efectiva < 0.01 && !el.closest('[aria-hidden="true"]')) {
      malos.push(el.tagName + ' style="' + (el.getAttribute('style') || '') + '"');
      if (malos.length >= 3) break;
    }
  }
  return JSON.stringify(malos);
})()`;

let fallos = 0;
const servidor = await encenderServidor(PUERTO, process.env.MODO ?? "dev");
apagarAlRecibirSenal(servidor);
const chrome = await encenderChrome();
const pesta = await abrirPestana();

try {
  await pesta.fijarViewport(1280, 900); // el menú de escritorio está a la vista
  for (const reducido of [true, false]) {
    const modo = reducido ? "reduce" : "no-preference";
    await pesta.emularMovimiento(reducido);
    await pesta.navegar(`http://localhost:${PUERTO}/`);
    await esperar(ESPERA_ANIMACION_MS);

    for (const ruta of RUTAS) {
      // Clic de verdad sobre el enlace: navegación del cliente, no una carga.
      const clic = await pesta.evaluar(
        `(function () {
          var a = document.querySelector('header a[href="${ruta}"]');
          if (!a) return false;
          a.click();
          return true;
        })()`,
      );
      if (!clic) {
        fallos++;
        console.log(`${modo} ${ruta} -> ERROR: no hay enlace en el menú`);
        continue;
      }
      // En dev la primera visita compila la ruta: se espera la llegada, no un tiempo fijo.
      for (let i = 0; i < 60 && (await pesta.evaluar("location.pathname")) !== ruta; i++) await esperar(500);
      await esperar(ESPERA_ANIMACION_MS);

      const llegada = await pesta.evaluar("location.pathname");
      const malos = JSON.parse((await pesta.evaluar(SONDA)) ?? "[]");
      const problema = llegada !== ruta ? `no llegó (estaba en ${llegada})` : malos.length ? `INVISIBLE: ${malos.join(" | ")}` : "";
      if (problema) fallos++;
      console.log(`${modo} ${ruta} -> ${problema || "ok"}`);
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
  console.log(`FALLO: ${fallos} navegación(es) con contenido invisible.`);
  process.exit(1);
}
console.log("VERIFICACIÓN LIMPIA: el contenido es visible tras navegar por clic, con y sin movimiento reducido.");
