/**
 * Cookie de actividad del panel: lleva la hora del último movimiento de un
 * administrador, firmada. Sin `server-only` a propósito: la lee el middleware,
 * que corre en edge y usa Web Crypto (existe también en Node).
 *
 * Por qué hace falta: Supabase sin plan Pro no caduca la sesión por
 * inactividad, así que quien copie las cookies de sesión de un administrador
 * las puede usar hasta que expire el token. Con esta cookie, el middleware
 * rechaza una sesión de panel cuya última actividad tenga más de 5 minutos.
 *
 * Firmada con HMAC y atada al id del usuario: sin la firma, quien robara las
 * cookies de Supabase se fabricaría una hora reciente. La clave sale de
 * SUPABASE_SERVICE_ROLE_KEY, que nunca llega al navegador.
 *
 * Formato: `<id>.<hora en ms>.<hmac-sha256 en hex>`. Un id de Supabase es un
 * uuid, sin puntos, así que el separador no es ambiguo.
 */

export const COOKIE_ACTIVIDAD = "tsw.actividad";
export const VENTANA_INACTIVIDAD_MS = 5 * 60 * 1000;

export const OPCIONES_COOKIE_ACTIVIDAD = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/admin",
  maxAge: 60 * 60 * 12,
} as const;

const codificar = new TextEncoder();

async function clave(): Promise<CryptoKey> {
  const secreto = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secreto) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY para firmar la actividad.");
  return crypto.subtle.importKey("raw", codificar.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

const aHex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const deHex = (h: string) => Uint8Array.from(h.match(/../g) ?? [], (x) => parseInt(x, 16));

export async function firmarActividad(usuarioId: string, ahora = Date.now()): Promise<string> {
  const base = `${usuarioId}.${ahora}`;
  const firma = await crypto.subtle.sign("HMAC", await clave(), codificar.encode(base));
  return `${base}.${aHex(firma)}`;
}

/** ¿La cookie es de este usuario, está bien firmada y la actividad es de hace menos de 5 minutos? */
export async function actividadVigente(
  valor: string | undefined,
  usuarioId: string,
  ahora = Date.now(),
): Promise<boolean> {
  if (!valor) return false;
  const [id, hora, firma, ...resto] = valor.split(".");
  if (resto.length > 0 || id !== usuarioId || !hora || !firma || !/^[0-9a-f]{64}$/.test(firma)) return false;

  const t = Number(hora);
  // Una hora en el futuro (con 1 minuto de margen por desfase de relojes) no es de una cookie legítima.
  if (!Number.isFinite(t) || ahora - t > VENTANA_INACTIVIDAD_MS || t - ahora > 60_000) return false;

  try {
    return await crypto.subtle.verify("HMAC", await clave(), deHex(firma), codificar.encode(`${id}.${hora}`));
  } catch {
    return false;
  }
}
