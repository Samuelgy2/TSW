import "server-only";

/**
 * Límite de intentos de acceso, en memoria del proceso.
 *
 * Por clave (IP + correo): el quinto fallo en 15 minutos bloquea 5 minutos
 * contados desde ese fallo, y se rechaza sin consultar a Auth. Pasado el
 * bloqueo la cuenta de fallos empieza de cero. Los aciertos limpian la clave.
 *
 * Alcance: cada instancia del servidor lleva su propio conteo, así que en
 * Vercel un atacante que reparta intentos entre instancias supera este tope.
 * Es la primera línea, no la única: Supabase Auth aplica su propio límite por
 * IP y el contraseñas se verifican con bcrypt del lado de Auth. Si hiciera
 * falta un límite global, el sitio es Upstash/Redis o la tabla de la base.
 */

const MAX_INTENTOS = 5;
/** Fallos desde una misma IP, sea cual sea el correo: frena el "password spraying". */
export const MAX_INTENTOS_POR_IP = 20;
const VENTANA_MS = 15 * 60 * 1000;
const BLOQUEO_MS = 5 * 60 * 1000;

type Registro = { intentos: number[]; hasta: number };

const registros = new Map<string, Registro>();

function limpiar(registro: Registro, ahora: number) {
  registro.intentos = registro.intentos.filter((t) => ahora - t < VENTANA_MS);
}

/** Segundos que faltan para poder volver a intentar, o 0 si se puede ya. */
export function segundosDeBloqueo(clave: string): number {
  const registro = registros.get(clave);
  if (!registro) return 0;
  const ahora = Date.now();
  if (registro.hasta > ahora) return Math.ceil((registro.hasta - ahora) / 1000);
  return 0;
}

export function registrarFallo(clave: string, max = MAX_INTENTOS) {
  const ahora = Date.now();
  const registro = registros.get(clave) ?? { intentos: [], hasta: 0 };
  // Bloqueo ya cumplido: se empieza de cero.
  if (registro.hasta <= ahora) registro.hasta = 0;
  if (registro.hasta === 0 && registro.intentos.length >= max) registro.intentos = [];
  limpiar(registro, ahora);
  registro.intentos.push(ahora);
  if (registro.intentos.length >= max) registro.hasta = ahora + BLOQUEO_MS;
  registros.set(clave, registro);

  // Poda ocasional para que el mapa no crezca sin límite.
  if (registros.size > 1000) {
    for (const [k, r] of registros) {
      limpiar(r, ahora);
      if (r.intentos.length === 0 && r.hasta <= ahora) registros.delete(k);
    }
  }
}

export function registrarAcierto(clave: string) {
  registros.delete(clave);
}

/** Respuesta de acceso bloqueado, o null si se puede intentar. `espera` alimenta el contador de la pantalla. */
export function bloqueoAcceso(...claves: string[]) {
  const espera = Math.max(...claves.map(segundosDeBloqueo));
  return espera > 0
    ? ({ ok: false, error: "Demasiados intentos. Espera a que termine el contador.", espera } as const)
    : null;
}
