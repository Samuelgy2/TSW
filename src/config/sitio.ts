/**
 * Datos del club que todavía no tengo.
 *
 * Todo lo que aparece entre corchetes es un placeholder: se reemplaza aquí, en
 * un solo sitio, cuando el club entregue la información. Ninguna página inventa
 * teléfonos, direcciones ni cifras.
 */

export const SITIO = {
  nombre: "TSW",
  nombreLargo: "[Club Deportivo TSW]",
  lema: "[Lema del club]",
  descripcion:
    "Escuela de BMX: matrículas, uniformes, competencias y niveles de formación.",
} as const;

export const CONTACTO = {
  telefono: "[+57 300 000 0000]",
  telefonoEnlace: "tel:",
  correo: "[correo@dominio.com]",
  direccion: "[Dirección de la sede]",
  ciudad: "[Ciudad]",
  horario: "[Horario de atención]",
  whatsapp: "[https://wa.me/57XXXXXXXXXX]",
} as const;

export const REDES = [
  { nombre: "Instagram", url: "[https://instagram.com/...]" },
  { nombre: "Facebook", url: "[https://facebook.com/...]" },
  { nombre: "YouTube", url: "[https://youtube.com/...]" },
] as const;

/**
 * Cifras de la franja roja de la portada.
 *
 * `valor` en `null` significa que el dato todavía no existe: la tarjeta lo
 * muestra como pendiente en vez de inventar un número, y la cuenta ascendente
 * se activa sola en cuanto se escriba una cifra real.
 */
export type Cifra = {
  valor: number | null;
  sufijo?: string;
  etiqueta: string;
};

export const CIFRAS: Cifra[] = [
  { valor: null, sufijo: "+", etiqueta: "[Deportistas formados]" },
  { valor: null, sufijo: "", etiqueta: "[Años de trayectoria]" },
  { valor: null, sufijo: "", etiqueta: "[Competencias al año]" },
  { valor: null, sufijo: "", etiqueta: "[Niveles de formación]" },
];

/** Navegación principal. "La escuela" despliega submenú. */
export type EnlaceNav = {
  etiqueta: string;
  href: string;
  submenu?: { etiqueta: string; href: string; descripcion: string }[];
};

export const NAVEGACION: EnlaceNav[] = [
  {
    etiqueta: "La escuela",
    href: "/semilleros",
    submenu: [
      {
        etiqueta: "Semilleros y niveles",
        href: "/semilleros",
        descripcion: "La ruta de formación, de la iniciación a la competencia.",
      },
      {
        etiqueta: "Matrículas",
        href: "/matriculas",
        descripcion: "Documentos para descargar. La radicación es presencial.",
      },
    ],
  },
  { etiqueta: "Competencias", href: "/competencias" },
  { etiqueta: "Tienda", href: "/tienda" },
];

export const ENLACES_LEGALES = [
  { etiqueta: "Política de tratamiento de datos", href: "/legal/datos" },
  { etiqueta: "Términos y condiciones", href: "/legal/terminos" },
  { etiqueta: "Política de devoluciones", href: "/legal/devoluciones" },
] as const;
