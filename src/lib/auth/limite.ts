import "server-only";

/**
 * Límite de intentos de acceso, en memoria del proceso.
 *
 * Ventana deslizante por clave (IP + correo): a partir del quinto intento
 * fallido en 15 minutos se rechaza sin consultar a Auth. Los aciertos limpian
 * la clave.
 *
 * Alcance: cada instancia del servidor lleva su propio conteo, así que en
 * Vercel un atacante que reparta intentos entre instancias supera este tope.
 * Es la primera línea, no la única: Supabase Auth aplica su propio límite por
 * IP y el contraseñas se verifican con bcrypt del lado de Auth. Si hiciera
 * falta un límite global, el sitio es Upstash/Redis o la tabla de la base.
 */

const MAX_INTENTOS = 5;
const VENTANA_MS = 15 * 60 * 1000;

type Registro = { intentos: number[]; };

const registros = new Map<string, Registro>();

function limpiar(registro: Registro, ahora: number) {
  registro.intentos = registro.intentos.filter((t) => ahora - t < VENTANA_MS);
}

/** Segundos que faltan para poder volver a intentar, o 0 si se puede ya. */
export function segundosDeBloqueo(clave: string): number {
  const registro = registros.get(clave);
  if (!registro) return 0;
  const ahora = Date.now();
  limpiar(registro, ahora);
  if (registro.intentos.length < MAX_INTENTOS) return 0;
  const masAntiguo = registro.intentos[0] ?? ahora;
  return Math.max(1, Math.ceil((VENTANA_MS - (ahora - masAntiguo)) / 1000));
}

export function registrarFallo(clave: string) {
  const ahora = Date.now();
  const registro = registros.get(clave) ?? { intentos: [] };
  limpiar(registro, ahora);
  registro.intentos.push(ahora);
  registros.set(clave, registro);

  // Poda ocasional para que el mapa no crezca sin límite.
  if (registros.size > 1000) {
    for (const [k, r] of registros) {
      limpiar(r, ahora);
      if (r.intentos.length === 0) registros.delete(k);
    }
  }
}

export function registrarAcierto(clave: string) {
  registros.delete(clave);
}
