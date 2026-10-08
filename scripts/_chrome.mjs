// Chrome headless por DevTools (websocket nativo de Node 22+), compartido por
// verificar-overflow.mjs y verificar-visibilidad.mjs.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { esperar } from "./_servidor.mjs";

const PUERTO_DEVTOOLS = process.env.PUERTO_DEVTOOLS ?? "9223";

const ejecutable =
  process.env.CHROME_PATH ??
  (process.platform === "win32" ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
    : process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : "chrome");

export const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "tsw-chrome-"));

/** Enciende Chrome headless con puerto de depuración y espera el endpoint. */
export async function encenderChrome() {
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
      const res = await fetch(`http://127.0.0.1:${PUERTO_DEVTOOLS}/json/version`);
      if (res.ok) return chrome;
    } catch {
      /* todavía no */
    }
    await esperar(250);
  }
  throw new Error("Chrome headless no respondió en el puerto de depuración.");
}

/**
 * Se conecta por websocket a la primera pestaña (el about:blank inicial) y
 * la reutiliza para todas las mediciones: navegar una sola pestaña es más
 * fiable que crear pestañas con /json/new, cuya respuesta cambia de formato
 * entre versiones de Chrome.
 */
export async function abrirPestana() {
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
      mensaje.error ? rej(new Error(mensaje.error.message)) : res(mensaje.result);
    }
  };

  function pedir(metodo, params = {}) {
    const pedido = ++id;
    ws.send(JSON.stringify({ id: pedido, method: metodo, params }));
    return new Promise((res, rej) => pendientes.set(pedido, { res, rej }));
  }

  return {
    async evaluar(expresion) {
      const resultado = await pedir("Runtime.evaluate", { expression: expresion, returnByValue: true });
      return resultado.result?.value;
    },
    async fijarViewport(ancho, alto) {
      await pedir("Emulation.setDeviceMetricsOverride", {
        width: ancho,
        height: alto,
        deviceScaleFactor: 1,
        mobile: ancho < 700,
      });
    },
    async navegar(url) {
      await pedir("Page.enable");
      await pedir("Page.navigate", { url });
    },
    /** Emula la preferencia del sistema `prefers-reduced-motion`. */
    async emularMovimiento(reducido) {
      await pedir("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: reducido ? "reduce" : "no-preference" }],
      });
    },
    async cerrar() {
      ws.close();
    },
  };
}
