/**
 * Identidad, contacto y navegación del sitio.
 *
 * Los datos de contacto salen del documento de la cliente (sección 1,
 * "Elementos globales"), y solo de ahí. Lo que el documento no trae —dirección
 * de calle, dirección de notificación del RUT— no aparece: no hay placeholder
 * entre corchetes que lo tape, porque un `[Dirección]` publicado es un error
 * visible y un dato inventado es un error invisible. El resto del contenido
 * fijo (portada, matrículas, semilleros, tienda) vive en ./contenido.ts.
 */

/**
 * URL pública del sitio, sin barra final. Única fuente: metadataBase, los
 * enlaces de correo, robots.txt y sitemap.xml salen de aquí. La variable
 * permite apuntar a localhost o a un preview; sin ella, el dominio real.
 */
export const URL_SITIO = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.corporaciontws.com").replace(/[/]$/, "");

export const SITIO = {
  nombre: "TSW",
  nombreLargo: "Corporación Deportiva TSW",
  /** Texto corto bajo el logo: qué es la entidad. */
  subtitulo: "Corporación deportiva",
  /**
   * Logo de la corporación, como ruta dentro de /public (por ejemplo
   * "/imagenes/logocorporacion.png"). Es la marca del sitio, como el favicon,
   * no contenido que se edite desde el panel. En null la cabecera reserva su
   * hueco con un marcador.
   */
  logo: "/imagenes/logocorporacion.png" as string | null,
  lema: "No dudamos de las cosas maravillosas que puede hacer el deporte en el ser humano.",
  descripcion:
    "Corporación deportiva: matrículas, semilleros, competencias y dotación oficial de cada deporte.",
} as const;

/**
 * Identificación legal de la corporación, para las páginas de /legal.
 *
 * `nitConfirmado` en false mantiene el NIT OCULTO en todo el sitio. El
 * documento de la cliente trae `902.072.786-0`, pero su propia lista de
 * pendientes dice que el dígito de verificación lo calculó ella y hay que
 * confirmarlo con el RUT. Un NIT con el dígito equivocado en la política de
 * datos es peor que no ponerlo: identifica a otra entidad, o a ninguna.
 *
 * El dígito coincide con el algoritmo de la DIAN —lo cruza
 * `npm run verificar:legales` contra `calcularDvNit`—, así que lo que falta no
 * es la aritmética: es que la cliente confirme que el NIT base es ese. Cuando
 * mande el RUT, esto pasa a true y aparece; si al teclearlo se cambia una
 * cifra, la verificación corta antes del commit.
 */
export const IDENTIDAD_LEGAL = {
  /** NIT base, sin dígito de verificación. */
  nit: "902.072.786",
  /** Dígito de verificación, tal como lo escribió la cliente. */
  nitDv: 0,
  nitConfirmado: false,
  /** Del documento, sección 1: son afiliaciones, no un registro tributario. */
  reconocimiento: "Reconocimiento deportivo INDER Medellín",
  afiliacion: "Afiliada a la Liga Antioqueña de Ciclismo",
  /**
   * Dirección de notificación de las páginas legales. La cliente anotó "la del
   * RUT" y no la mandó, así que sigue en su lista de pendientes y las páginas
   * legales no la muestran.
   */
  direccionNotificacion: null,
} as const;

/**
 * Las tres páginas legales han pasado revisión de un abogado.
 *
 * En false —lo de hoy— cada una abre con un aviso visible de que es un borrador
 * y lleva `noindex`. El texto es la adaptación técnica de los borradores de la
 * cliente (ver docs/legales-cambios-para-cliente.md): sirve para que ella lo
 * revise y para que los enlaces del pie no caigan en un 404, pero un texto legal
 * sin revisar indexado en Google es un documento que obliga y que nadie aprobó.
 *
 * `noindex` y no bloquear la página: la cliente y su asesor tienen que poder
 * leerla en el sitio. Lo que no debe pasar es que sea el resultado que un
 * comprador encuentra buscando "política de devoluciones TSW".
 */
export const LEGALES_APROBADAS = false;

/** Lo que `nitPublicable` necesita saber. Suelto, para poder probarlo en los dos estados. */
export type IdentidadNit = {
  nit: string;
  nitDv: number;
  nitConfirmado: boolean;
};

/**
 * El NIT listo para publicar —"902.072.786-0"—, o null mientras no esté
 * confirmado.
 *
 * Una sola función y no un `&&` en cada plantilla: el NIT sale en el pie y en
 * las tres páginas legales, y cuatro condiciones repetidas son cuatro sitios
 * donde olvidarse de una. Quien quiera publicarlo pregunta aquí; si devuelve
 * null, no hay nada que poner y no se pone nada —ni un guion, ni corchetes—.
 */
export function nitPublicable(identidad: IdentidadNit): string | null {
  return identidad.nitConfirmado ? `${identidad.nit}-${identidad.nitDv}` : null;
}

/** El NIT de la corporación, o null. Lo que usan las páginas. */
export const NIT_PUBLICO = nitPublicable(IDENTIDAD_LEGAL);

/**
 * Contacto, del documento de la cliente (sección 1).
 *
 * Dos números, los dos de WhatsApp. El primero es el de los botones de todo el
 * sitio —el documento lo fija en `wa.me/573227073535`, y ese número vive en
 * `NEXT_PUBLIC_WHATSAPP_NUMERO`, no aquí: `src/lib/whatsapp.ts` es el único
 * sitio que construye enlaces de WhatsApp—. Lo de aquí es el número escrito,
 * para leerlo y para el enlace `tel:`.
 *
 * No hay dirección de calle: el documento da sedes (dos pistas) y barrio, y
 * nada más. Por eso `sedes` es una lista y no un campo `direccion`: con dos
 * pistas, un solo renglón obligaría a elegir una, y elegir sería inventar.
 */
export const CONTACTO = {
  telefono: "+57 322 707 3535",
  telefonoSecundario: "+57 321 688 5078",
  correo: "tswclubbmx@gmail.com",
  sedes: ["Pista Antonio Roldán Betancur", "Pista Mariana Pajón"],
  barrio: "Barrio Belén",
  ciudad: "Medellín",
  horario: "Lunes a sábado, de 10:00 a. m. a 9:00 p. m.",
} as const;

/** "Barrio Belén, Medellín", en un solo sitio para no repetir la coma. */
export const UBICACION = `${CONTACTO.barrio}, ${CONTACTO.ciudad}`;

/** Las dos sedes en un renglón, para cuando no cabe una lista. */
export const SEDES_EN_LINEA = CONTACTO.sedes.join(" · ");

/**
 * Número para el atributo `href` de un enlace `tel:`: sin espacios ni signos
 * que el marcador del teléfono no entiende.
 */
export function enlaceTelefono(numero: string): string {
  return `tel:${numero.replace(/[^\d+]/g, "")}`;
}

/**
 * La tienda enseña precios o no.
 *
 * En false, el catálogo y el detalle no muestran ninguna cifra y el pedido sale
 * por WhatsApp sin importes: la cliente lo pidió así en su lista de ajustes
 * ("Tienda: ocultarla o convertirla en catálogo con el botón Pedir por WhatsApp
 * hasta que haya precios") porque los seis productos todavía no tienen precio
 * ni tallas definitivas.
 *
 * Es un interruptor y no un borrado del código de precios: el esquema, las
 * variantes y `formatearPrecio` siguen intactos, y el panel sí muestra los
 * precios. Cuando lleguen, esto pasa a true y la tienda vuelve a ser tienda.
 */
export const TIENDA_MUESTRA_PRECIOS = false;

/**
 * Qué confirma el club cuando llega el pedido. En un solo sitio porque lo dicen
 * cuatro textos —tienda, detalle, carrito y el aviso del resumen— y con la
 * tienda en modo catálogo hay que nombrar el precio: prometer solo "cómo pagar"
 * donde no se ve ninguna cifra deja al comprador esperando un total que nunca
 * apareció.
 */
export const TIENDA_QUE_CONFIRMA = TIENDA_MUESTRA_PRECIOS
  ? "el club confirma disponibilidad y te indica cómo pagar"
  : "el club confirma disponibilidad, te da el precio y te indica cómo pagar";

/**
 * Milisegundos entre diapositivas del carrusel de la portada. Con más de una
 * diapositiva activa rota sola; el visitante puede pausarla con el botón del
 * carrusel, y con movimiento reducido no arranca sola (ver `Carrusel`).
 */
export const CARRUSEL_INTERVALO_MS = 15_000;

/**
 * Las tres cuentas de Instagram del documento del cliente (22-09-2026). No hay
 * Facebook ni YouTube: los iconos que estaban antes apuntaban a una URL entre
 * corchetes, así que eran enlaces rotos con forma de red social.
 */
export const REDES = [
  { nombre: "Corporación Deportiva TSW", url: "https://www.instagram.com/corporaciond.tsw" },
  { nombre: "BMX Club TSW", url: "https://www.instagram.com/bmx_clubtsw" },
  { nombre: "BMX Mastercross", url: "https://www.instagram.com/bmxmastercross" },
] as const;

/**
 * Navegación principal, plana como en el rediseño: cinco puertas, sin
 * submenú. El submenú sigue soportado por Header por si vuelve a hacer falta.
 */
export type EnlaceNav = {
  etiqueta: string;
  href: string;
  submenu?: { etiqueta: string; href: string; descripcion: string }[];
};

export const NAVEGACION: EnlaceNav[] = [
  { etiqueta: "Corporación", href: "/" },
  { etiqueta: "Semilleros", href: "/semilleros" },
  { etiqueta: "Competencias", href: "/competencias" },
  { etiqueta: "Matrículas", href: "/matriculas" },
  { etiqueta: "Tienda", href: "/tienda" },
];

/** Columnas del pie, como en el rediseño: institucional, servicios y sede. */
export const PIE_INSTITUCIONAL = [
  { etiqueta: "Nuestros pilares", href: "/#titulo-pilares" },
  { etiqueta: "Nuestros clubes", href: "/#titulo-clubes" },
  { etiqueta: "Documentos", href: "/#titulo-documentos-portal" },
  // El documento del cliente pide renombrarlo o quitarlo: se llamaba
  // "[Estatutos y reglamentos]" —un placeholder— y llevaba a Matrículas, que
  // es donde de verdad se descarga el reglamento interno. Renombrado, no
  // inventado: no hay URL propia del PDF hasta que se publique su versión.
  { etiqueta: "Reglamento interno", href: "/matriculas" },
] as const;

export const PIE_SERVICIOS = [
  { etiqueta: "Semilleros y niveles", href: "/semilleros" },
  { etiqueta: "Competencias y resultados", href: "/competencias" },
  { etiqueta: "Matrículas", href: "/matriculas" },
  { etiqueta: "Dotación y tienda", href: "/tienda" },
  // "Mi cuenta" (/cuenta/acceso) vuelve cuando se habiliten las cuentas de usuario.
] as const;

export const ENLACES_LEGALES = [
  { etiqueta: "Política de tratamiento de datos", href: "/legal/datos" },
  { etiqueta: "Términos y condiciones", href: "/legal/terminos" },
  { etiqueta: "Política de devoluciones", href: "/legal/devoluciones" },
] as const;
