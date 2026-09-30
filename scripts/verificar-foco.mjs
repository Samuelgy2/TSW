/**
 * Mide el CONTRASTE REAL del anillo de foco sobre el build de producción.
 *
 * Por qué sobre producción y no sobre `next dev`: el anomalía que disparó esto
 * —`outline-color` computado como `currentColor` en los enlaces del pie y la
 * cabecera, sobre fondo oscuro— se observó en desarrollo, donde Tailwind sirve
 * el CSS por otro camino. Si el fallo es real tiene que verse en el CSS
 * optimizado que recibe el visitante; si no se ve, era un artefacto del
 * servidor de desarrollo y hay que decirlo.
 *
 * Qué mide, para cada elemento que recibe el foco con Tab:
 *
 * 1. El color del anillo. Si `outline-color` computa a la palabra
 *    `currentcolor`, el anillo toma el `color` del elemento: eso es lo que se
 *    mide, porque es lo que se ve.
 * 2. El fondo detrás. Se sube por los ancestros hasta el primer
 *    `background-color` que no sea transparente, que es lo que hace el
 *    navegador al pintar.
 * 3. El contraste entre los dos, con la fórmula de WCAG 2.1. El anillo de foco
 *    es un componente de interfaz: el mínimo es **3:1**, no 4.5.
 *
 * Se recorre el foco con eventos de teclado reales (`Input.dispatchKeyEvent`) y
 * no con `element.focus()`, porque `:focus-visible` no se activa igual por
 * programa y el anillo podría no estar aplicado.
 *
 * Uso: PUERTO=3313 node scripts/verificar-foco.mjs
 * Requiere un build en `.next-verificar`, que es donde sale el de
 * `verificar:completo`. Suelto: `NEXT_DIST_DIR=.next-verificar npx next build`.
 * Un `npm run build` normal sale a `.next` y aquí no sirve — a propósito: así el
 * chequeo no se apoya en un build que Samuel pueda estar reescribiendo.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { apagarAlRecibirSenal, apagarServidor, encenderServidor, esperar } from "./_servidor.mjs";

const PUERTO = process.env.PUERTO ?? "3313";
const PUERTO_DEVTOOLS = process.env.PUERTO_DEVTOOLS ?? "9225";
const MINIMO = 3.0;

/** Tabulaciones por ruta. Suficientes para pasar por cabecera, cuerpo y pie. */
const RUTAS = process.env.RUTAS
  ? process.env.RUTAS.split(",").map((r) => r.trim()).filter(Boolean)
  : [
      "/",
      "/laboratorio",
      "/semilleros?club=bmx-mastercross",
      "/tienda",
      "/matriculas",
      // Una legal: el índice del documento son ~10 enlaces nuevos y el aviso de
      // borrador es un color que no aparece en ninguna otra vista.
      "/legal/datos",
      "/admin/login",
    ];

const TABS = Number(process.env.TABS ?? 70);

const ejecutable =
  process.env.CHROME_PATH ??
  (process.platform === "win32" ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
    : process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : "chrome");

const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "tsw-foco-"));

async function encenderChrome() {
  const chrome = spawn(
    ejecutable,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      `--user-data-dir=${perfil}`,
      `--remote-debugging-port=${PUERTO_DEVTOOLS}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${PUERTO_DEVTOOLS}/json/version`)).ok) return chrome;
    } catch {
      /* todavía no */
    }
    await esperar(250);
  }
  throw new Error("Chrome headless no respondió en el puerto de depuración.");
}

async function abrirPestana() {
  const lista = await (await fetch(`http://127.0.0.1:${PUERTO_DEVTOOLS}/json/list`)).json();
  const pagina = lista.find((t) => t.type === "page");
  if (!pagina) throw new Error("No hay pestañas en Chrome headless.");

  const ws = new WebSocket(pagina.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = () => rej(new Error("No se pudo abrir el websocket de DevTools."));
  });

  let id = 0;
  const pendientes = new Map();
  ws.onmessage = (evento) => {
    const mensaje = JSON.parse(evento.data);
    if (mensaje.id && pendientes.has(mensaje.id)) {
      const { res, rej } = pendientes.get(mensaje.id);
      pendientes.delete(mensaje.id);
      if (mensaje.error) rej(new Error(mensaje.error.message));
      else res(mensaje.result);
    }
  };

  function pedir(metodo, params = {}) {
    const pedido = ++id;
    ws.send(JSON.stringify({ id: pedido, method: metodo, params }));
    return new Promise((res, rej) => pendientes.set(pedido, { res, rej }));
  }

  return {
    pedir,
    async evaluar(expresion) {
      const r = await pedir("Runtime.evaluate", { expression: expresion, returnByValue: true });
      if (r.exceptionDetails) {
        throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      }
      return r.result?.value;
    },
    async tab() {
      // Tecla real: rawKeyDown + keyUp. `element.focus()` no dispara
      // :focus-visible igual, y es justamente el anillo lo que se mide.
      await pedir("Input.dispatchKeyEvent", {
        type: "rawKeyDown",
        key: "Tab",
        code: "Tab",
        windowsVirtualKeyCode: 9,
        nativeVirtualKeyCode: 9,
      });
      await pedir("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    },
    async navegar(url) {
      await pedir("Page.enable");
      await pedir("Page.navigate", { url });
    },
    cerrar: () => ws.close(),
  };
}

/**
 * Expresión que describe el elemento con el foco: color del anillo, fondo
 * efectivo detrás, y el contraste entre los dos. La cuenta se hace en la página
 * para no ir y venir por el websocket por cada canal de color.
 */
const SONDA = `(function () {
  var el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;

  function canales(css) {
    var m = String(css).match(/-?[\\d.]+/g);
    if (!m) return null;
    var alfa = m.length > 3 ? parseFloat(m[3]) : 1;
    return { r: +m[0], g: +m[1], b: +m[2], a: alfa };
  }

  function sobre(frente, fondo) {
    // Mezcla alfa: un anillo semitransparente se ve mezclado con su fondo.
    if (frente.a >= 1) return frente;
    return {
      r: frente.r * frente.a + fondo.r * (1 - frente.a),
      g: frente.g * frente.a + fondo.g * (1 - frente.a),
      b: frente.b * frente.a + fondo.b * (1 - frente.a),
      a: 1,
    };
  }

  function luminancia(c) {
    var v = [c.r, c.g, c.b].map(function (canal) {
      var s = canal / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }

  function contraste(a, b) {
    var la = luminancia(a), lb = luminancia(b);
    var claro = Math.max(la, lb), oscuro = Math.min(la, lb);
    return (claro + 0.05) / (oscuro + 0.05);
  }

  var estilo = getComputedStyle(el);

  // El fondo sobre el que se pinta el anillo.
  //
  // Con outline-offset positivo el anillo va POR FUERA del borde del elemento,
  // así que el fondo que cuenta es el del padre y NO el relleno del propio
  // elemento. Medirlo desde el elemento daba falsos positivos justo en los
  // botones primarios: se comparaba el anillo contra el azul del botón cuando
  // el anillo cae sobre el blanco de la sección.
  var desplazamiento = parseFloat(estilo.outlineOffset) || 0;
  var fondoCss = null, nodo = desplazamiento > 0 ? el.parentElement : el;
  while (nodo) {
    var c = canales(getComputedStyle(nodo).backgroundColor);
    if (c && c.a > 0) { fondoCss = c; break; }
    nodo = nodo.parentElement;
  }
  var fondo = fondoCss || { r: 255, g: 255, b: 255, a: 1 };

  // Si outline-color computa a la palabra currentcolor, el anillo toma el color
  // del texto: eso es lo que se pinta y lo que hay que medir.
  var crudo = estilo.outlineColor;
  var esCurrentColor = /currentcolor/i.test(crudo);
  var anilloCss = esCurrentColor ? estilo.color : crudo;
  var anillo = canales(anilloCss);
  if (!anillo) return null;

  var mezclado = sobre(anillo, fondo);

  var etiqueta = el.tagName.toLowerCase() +
    (el.getAttribute('class') ? '.' + el.getAttribute('class').split(/\\s+/).slice(0, 2).join('.') : '') +
    ' "' + (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 28) + '"';

  return {
    etiqueta: etiqueta,
    ancho: estilo.outlineWidth,
    estiloAnillo: estilo.outlineStyle,
    currentColor: esCurrentColor,
    anillo: anilloCss,
    fondo: 'rgb(' + Math.round(fondo.r) + ' ' + Math.round(fondo.g) + ' ' + Math.round(fondo.b) + ')',
    contraste: Math.round(contraste(mezclado, fondo) * 100) / 100,
  };
})()`;

const servidor = await encenderServidor(PUERTO, "start");
apagarAlRecibirSenal(servidor);
const chrome = await encenderChrome();
const pesta = await abrirPestana();

const fallos = [];
let medidos = 0;
let conCurrentColor = 0;

try {
  for (const ruta of RUTAS) {
    await pesta.navegar(`http://localhost:${PUERTO}${ruta}`);
    await esperar(1800);
    // El foco empieza en el documento; el primer Tab entra al primer enlace.
    const vistos = new Set();

    for (let i = 0; i < TABS; i++) {
      await pesta.tab();
      // Espera antes de leer: la utilidad `transition-colors` de Tailwind 4
      // incluye outline-color, así que el anillo puede estar A MEDIO camino
      // desde currentColor cuando se mide. Sin esta pausa el color leído es el
      // del instante 0 de la transición y la medición miente: daba blanco sobre
      // blanco en el botón flotante de WhatsApp, que en reposo está bien.
      await esperar(220);
      const dato = await pesta.evaluar(SONDA);
      if (!dato) continue;
      if (vistos.has(dato.etiqueta)) continue;
      vistos.add(dato.etiqueta);
      medidos += 1;
      if (dato.currentColor) conCurrentColor += 1;
      // DETALLE=1 lista cada elemento medido con su contraste: sirve para
      // comprobar que un control concreto (por ejemplo el botón de pausa del
      // carrusel) está entre los medidos y no solo que el total cuadra.
      if (process.env.DETALLE) console.log(`     ${ruta} · ${dato.etiqueta} → ${dato.contraste}:1`);

      const sinAnillo = dato.estiloAnillo === "none" || parseFloat(dato.ancho) === 0;
      if (sinAnillo) {
        fallos.push({ ruta, ...dato, motivo: "sin anillo de foco" });
        console.log(` FALLA  ${ruta} · ${dato.etiqueta}\n        sin anillo: outline-style=${dato.estiloAnillo} ancho=${dato.ancho}`);
        continue;
      }

      if (dato.contraste < MINIMO) {
        fallos.push({ ruta, ...dato, motivo: "contraste bajo" });
        console.log(
          ` FALLA  ${ruta} · ${dato.etiqueta}\n` +
            `        contraste ${dato.contraste}:1 (mínimo ${MINIMO}) · anillo ${dato.anillo}` +
            `${dato.currentColor ? " [currentColor]" : ""} sobre ${dato.fondo}`,
        );
      }
    }
    console.log(`  ${ruta}: ${vistos.size} elementos con foco medidos`);
  }
} finally {
  await pesta.cerrar();
  chrome.kill();
  apagarServidor(servidor);
  try {
    fs.rmSync(perfil, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
  } catch {
    /* perfil residual, sin efecto en el resultado */
  }
}

console.log("");
console.log(`Elementos medidos: ${medidos}. Con outline-color heredado (currentColor): ${conCurrentColor}.`);
console.log(`Por debajo de ${MINIMO}:1 o sin anillo: ${fallos.length}.`);
console.log("");
if (fallos.length > 0) process.exit(1);
console.log("VERIFICACIÓN LIMPIA: todo anillo de foco llega a 3:1 contra su fondo.");
