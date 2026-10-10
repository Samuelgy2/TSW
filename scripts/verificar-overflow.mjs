// Verificación de overflow horizontal a 360px y 1280px con Chrome headless.
// Habla con el protocolo DevTools por websocket (módulo nativo de Node 22+),
// comprueba si la página SCROLLEA de verdad en horizontal en cada ruta y
// ancho, y sale 1 si lo hace.
//
// Por qué no `scrollWidth - clientWidth`, que es lo que medía antes: esa
// resta da positivo en cualquier página que contenga un contenedor con
// scroll horizontal propio —el carrusel del hero, la tira de pestañas—
// aunque la página no se mueva ni un píxel. Medido: /laboratorio daba 548
// px de "desborde" y `scrollTo(500, 0)` dejaba `scrollX` en 0. Además
// dependía del momento: antes de que cargaran las imágenes del carrusel,
// la misma página daba 0.
//
// La prueba de abajo es la que importa para el requisito real —que nadie
// tenga que arrastrar la pantalla de lado—: se pide desplazar y se mira si
// se desplazó. Antes se sale 1 si hay
// desbordamiento. Uso: PUERTO=3311 node scripts/verificar-overflow.mjs
//
// Si el puerto no contesta, el script levanta `next dev` él mismo y lo apaga
// al terminar: `npm run verificar` tiene que poder correrse de un tirón antes
// de cada commit, sin acordarse de dejar un servidor encendido en otra
// terminal. Si ya hay uno, lo reutiliza y no lo toca.
import fs from "node:fs";
import process from "node:process";

import { abrirPestana, encenderChrome, perfil } from "./_chrome.mjs";
import { apagarAlRecibirSenal, apagarServidor, encenderServidor, esperar } from "./_servidor.mjs";

const PUERTO = process.env.PUERTO ?? "3311";
const ANCHOS = [360, 1280];

// Rutas nuevas de la corporación multideporte. /admin/* exige sesión y el
// proveedor Email de Supabase sigue apagado (bloqueante 2), así que el panel
// no es alcanzable sin login; se verifica lo público del alcance nuevo.
const RUTAS_POR_DEFECTO = [
  "/",
  "/semilleros",
  "/semilleros/bmx-mastercross",
  "/semilleros/habilidades-motrices",
  "/semilleros/no-existe",
  "/competencias",
  "/matriculas",
  "/tienda",
  "/carrito",
  "/laboratorio",
  "/admin/login",
];

// RUTAS="/,/tienda" node scripts/verificar-overflow.mjs acota la lista.
const RUTAS = process.env.RUTAS ? process.env.RUTAS.split(",").map((r) => r.trim()).filter(Boolean) : RUTAS_POR_DEFECTO;

/**
 * Segunda comprobación, porque la del desplazamiento tiene un punto ciego:
 * con `overflow-x: hidden` en html o body la página NO se desplaza aunque
 * haya contenido recortado fuera del viewport. El visitante no puede
 * arrastrar, pero tampoco puede leer lo que quedó cortado.
 *
 * Se buscan elementos visibles cuyo borde derecho pase del viewport (o cuyo
 * borde izquierdo quede por detrás del origen) y que NO cuelguen de un
 * ancestro con scroll horizontal propio —`overflow-x: auto | scroll`—, que
 * es contenido pensado para desplazarse dentro de su caja: el carrusel del
 * hero, la tira de pestañas.
 *
 * `overflow-x: hidden` NO exime: es justo el caso que esta comprobación
 * existe para encontrar.
 */
const SONDA_RECORTE = [
  "(function () {",
  "  var ancho = document.documentElement.clientWidth;",
  "  var malos = [];",
  "  var todos = document.body.querySelectorAll('*');",
  "  for (var i = 0; i < todos.length; i++) {",
  "    var el = todos[i];",
  "    var r = el.getBoundingClientRect();",
  "    if (r.width < 1 || r.height < 1) continue;",
  "    var s = getComputedStyle(el);",
  "    if (s.visibility === 'hidden' || s.display === 'none' || s.opacity === '0') continue;",
  "    if (r.right <= ancho + 1 && r.left >= -1) continue;",
  "    var n = el.parentElement, enScroller = false;",
  "    while (n && n !== document.documentElement) {",
  "      var ox = getComputedStyle(n).overflowX;",
  "      if (ox === 'auto' || ox === 'scroll') { enScroller = true; break; }",
  "      n = n.parentElement;",
  "    }",
  "    if (enScroller) continue;",
  "    var clases = (el.getAttribute('class') || '').split(/\\s+/).slice(0, 3).join('.');",
  "    malos.push(el.tagName + ' .' + clases + ' [' + Math.round(r.left) + '..' + Math.round(r.right) + ']');",
  "    if (malos.length >= 4) break;",
  "  }",
  "  return malos.join(' | ');",
  "})()",
].join("\n");

let fallos = 0;
const servidor = await encenderServidor(PUERTO);

apagarAlRecibirSenal(servidor);
const chrome = await encenderChrome();
const pesta = await abrirPestana();

try {
  for (const ancho of ANCHOS) {
    for (const ruta of RUTAS) {
      try {
        // Viewport emulado: 360px es viewport real aunque la ventana del
        // sistema sea mayor.
        await pesta.fijarViewport(ancho, ancho === 360 ? 800 : 900);
        await pesta.navegar(`http://localhost:${PUERTO}${ruta}`);
        await esperar(1500); // carga, hidratación y fuentes

        const exceso = await pesta.evaluar(
          `(function () {
            var antes = window.scrollX;
            window.scrollTo(9999, window.scrollY);
            var movido = window.scrollX;
            window.scrollTo(antes, window.scrollY);
            return movido;
          })()`,
        );
        const recortados = await pesta.evaluar(SONDA_RECORTE);

        const seDesplaza = exceso === null || exceso > 0;
        const hayRecorte = Boolean(recortados);
        if (seDesplaza || hayRecorte) fallos++;

        const problema = [
          seDesplaza ? `DESPLAZA ${exceso}px en horizontal` : null,
          hayRecorte ? `SE SALE DEL VIEWPORT: ${recortados}` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        console.log(`${ancho}px ${ruta} -> ${problema || "ok"}`);
      } catch (error) {
        fallos++;
        console.log(`${ancho}px ${ruta} -> ERROR: ${error.message}`);
      }
    }
  }

  await pesta.cerrar();
} finally {
  chrome.kill();
  apagarServidor(servidor);
  // Windows retiene archivos del perfil unos segundos tras kill(): la
  // limpieza es mejor esfuerzo y no debe tumbar la verificación.
  try {
    fs.rmSync(perfil, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
  } catch {
    /* perfil residual en %TEMP%, sin efecto en el resultado */
  }
}

if (fallos > 0) {
  console.log(`FALLO: ${fallos} medición(es) con desplazamiento horizontal o contenido fuera del viewport.`);
  process.exit(1);
}
console.log("VERIFICACIÓN LIMPIA: ninguna ruta se desplaza en horizontal ni deja contenido fuera de él.");
