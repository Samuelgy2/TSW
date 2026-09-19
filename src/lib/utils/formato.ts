/** Formatea centavos de COP como precio legible: 4500000 -> "$ 45.000". */
export function formatearPrecio(centavos: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Math.round(centavos / 100));
}

/**
 * Conversión pesos ↔ centavos. Vive aquí y en ningún otro lado: el formulario
 * del panel captura en pesos y antes de enviar pasa por pesosACentavos; para
 * mostrar, la base devuelve centavos y pasan por centavosAPesos. Si cada
 * componente multiplicara o dividiera por su cuenta, un precio se rompería en
 * silencio.
 */
export function pesosACentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

/** Centavos de COP a pesos con decimales: 4500000 -> 45000. */
export function centavosAPesos(centavos: number): number {
  return centavos / 100;
}

/**
 * Formatea una fecha ISO: "17 de septiembre de 2026".
 *
 * Una fecha sin hora ("2026-01-01", como `competencia.fecha`) es un día del
 * calendario, no un instante: se formatea en UTC para que no retroceda al 31
 * de diciembre al pasarla a Bogotá. Los timestamps sí van en hora de Colombia.
 */
export function formatearFecha(iso: string): string {
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: soloFecha ? "UTC" : "America/Bogota",
  }).format(new Date(iso));
}

/** Convierte un texto a slug: "Camiseta Oficial 2026" -> "camiseta-oficial-2026". */
export function aSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Fecha con hora en horario de Colombia: "17 de septiembre de 2026, 14:05". */
export function formatearFechaHora(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Bogota",
  }).format(new Date(iso));
}
