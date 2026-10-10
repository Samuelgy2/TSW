/**
 * Arranque y apagado del servidor de desarrollo para los chequeos que piden
 * páginas de verdad.
 *
 * Vive aparte porque lo usan dos: `verificar-overflow.mjs`, que mide en Chrome,
 * y `verificar-payload.mjs`, que solo hace fetch. Antes estaba dentro del
 * primero; tenerlo duplicado habría dejado dos apagados que envejecen distinto,
 * y el apagado es la parte delicada.
 */
import { spawn } from "node:child_process";
import process from "node:process";

export function esperar(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Carpeta de salida de cada modo, para no pisar el `.next` de Samuel ni pisarse
 * entre chequeos.
 *
 * Dos carpetas y no una: `next dev` y `next start` no pueden compartir salida.
 * Dev reescribe el manifiesto y borra el id del build de producción, así que un
 * `verificar:overflow` (dev) dejaba inservible el build que `verificar:foco`
 * (start) necesita. Con una carpeta por modo, el build se hace una vez al
 * principio y sobrevive a todo lo demás.
 *
 * Lo lee `next.config.ts` por `NEXT_DIST_DIR`.
 */
export const CARPETA_SALIDA = { dev: ".next-verificar-dev", start: ".next-verificar" };

/** ¿Contesta algo en el puerto? Cualquier respuesta HTTP cuenta, incluido un 404. */
export async function servidorVivo(base) {
  try {
    await fetch(base, { signal: AbortSignal.timeout(1500) });
    return true;
  } catch {
    return false;
  }
}

/**
 * Apaga el servidor con todo su árbol. Next bifurca un proceso hijo para
 * servir, así que matar solo al padre deja el puerto ocupado y la siguiente
 * corrida "reutiliza" un servidor con el código viejo.
 *
 * En Windows por `taskkill /T`; en Unix por grupo de procesos, que es para lo
 * que el hijo se lanza con `detached`.
 */
export function apagarServidor(servidor) {
  if (!servidor) return;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/PID", String(servidor.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      process.kill(-servidor.pid, "SIGTERM");
    }
  } catch {
    /* ya estaba muerto */
  }
}

/**
 * Levanta `next dev` en el puerto y espera a que conteste. Si ya hay uno vivo
 * falla, salvo con REUTILIZAR_SERVIDOR=1 (entonces devuelve null y no lo apaga).
 *
 * Se arranca con node sobre el binario de Next y no con `npm run dev`: npm mete
 * un proceso intermedio (y en Windows, además, cmd.exe) del que `kill()` no sabe
 * bajar.
 */
export async function encenderServidor(puerto, modo = "dev") {
  const base = `http://localhost:${puerto}`;

  if (await servidorVivo(base)) {
    // Un servidor que ya estaba ahí puede ser de otra corrida, de otro código o
    // estar a medias: medir contra él daba fallos (y aciertos) que no eran del
    // build. Solo se reutiliza si se pide a propósito.
    if (process.env.REUTILIZAR_SERVIDOR !== "1") {
      throw new Error(
        `El puerto ${puerto} ya contesta y no es de este chequeo. Apaga ese servidor, o ejecuta con REUTILIZAR_SERVIDOR=1 para medir contra él.`,
      );
    }
    console.log(`Reutilizando el servidor que ya contesta en ${base} (REUTILIZAR_SERVIDOR=1).`);
    return null;
  }

  console.log(`Levantando next ${modo} en ${base}${modo === "dev" ? " (el primer arranque compila)" : ""}.`);
  const servidor = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", modo, "-p", String(puerto)],
    {
      stdio: "ignore",
      detached: process.platform !== "win32",
      env: { ...process.env, NEXT_DIST_DIR: CARPETA_SALIDA[modo] ?? ".next" },
    },
  );

  // 120 s: el primer `next dev` de un árbol limpio compila antes de contestar.
  for (let i = 0; i < 240; i++) {
    if (await servidorVivo(base)) return servidor;
    await esperar(500);
  }
  apagarServidor(servidor);
  throw new Error(`next dev no contestó en ${base}.`);
}

/**
 * Ctrl-C no pasa por el `finally`, y en Unix el servidor va en su propio grupo
 * de procesos, así que la señal del terminal no le llega. Sin esto, cortar un
 * chequeo a mano dejaría el puerto ocupado.
 */
export function apagarAlRecibirSenal(servidor) {
  for (const senal of ["SIGINT", "SIGTERM"]) {
    process.once(senal, () => {
      apagarServidor(servidor);
      process.exit(130);
    });
  }
}
