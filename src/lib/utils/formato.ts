/** Formatea centavos de COP como precio legible: 4500000 -> "$ 45.000". */
export function formatearPrecio(centavos: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Math.round(centavos / 100));
}

/** Formatea una fecha ISO en horario de Colombia: "17 de septiembre de 2026". */
export function formatearFecha(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
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
