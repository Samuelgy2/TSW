import type { Metadata, Viewport } from "next";
import { Archivo_Black, Barlow } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { ProveedorCarrito } from "@/features/pedidos/carrito";
import { CONTACTO, REDES, SITIO, URL_SITIO } from "@/config/sitio";

import "@/styles/globals.css";

const fuenteDisplay = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--fuente-display",
  display: "swap",
});

const fuenteCuerpo = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--fuente-cuerpo",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    // Título de la pestaña, del documento del cliente: ya no es una escuela
    // de BMX, es una corporación con dos clubes y un programa.
    default: "Corporación Deportiva TSW — BMX en Medellín",
    template: "%s | TSW",
  },
  description: SITIO.descripcion,
  metadataBase: new URL(URL_SITIO),
  // La imagen sale de app/opengraph-image.png (convención de Next); Twitter reutiliza la de openGraph.
  openGraph: {
    type: "website",
    siteName: SITIO.nombreLargo,
    locale: "es_CO",
    title: "Corporación Deportiva TSW — BMX en Medellín",
    description: SITIO.descripcion,
    url: "/",
  },
  twitter: { card: "summary_large_image" },
};

/**
 * Datos estructurados para Google (schema.org): el nombre del sitio en los
 * resultados sale de WebSite, y la ficha de la organización de Organization.
 * Todo viene de config/sitio.ts: ningún dato escrito dos veces.
 */
const DATOS_ESTRUCTURADOS = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${URL_SITIO}/#sitio`,
      name: SITIO.nombreLargo,
      alternateName: SITIO.nombre,
      url: `${URL_SITIO}/`,
      inLanguage: "es-CO",
      publisher: { "@id": `${URL_SITIO}/#organizacion` },
    },
    {
      "@type": "SportsOrganization",
      "@id": `${URL_SITIO}/#organizacion`,
      name: SITIO.nombreLargo,
      alternateName: SITIO.nombre,
      url: `${URL_SITIO}/`,
      ...(SITIO.logo ? { logo: `${URL_SITIO}${SITIO.logo}` } : {}),
      description: SITIO.descripcion,
      telephone: CONTACTO.telefono,
      email: CONTACTO.correo,
      address: {
        "@type": "PostalAddress",
        streetAddress: CONTACTO.barrio,
        addressLocality: CONTACTO.ciudad,
        addressRegion: "Antioquia",
        addressCountry: "CO",
      },
      sameAs: REDES.map((red) => red.url),
    },
  ],
};

// `<` escapado: un texto con "</script>" no puede cerrar la etiqueta. Es el
// único dangerouslySetInnerHTML del sitio: React escapa las comillas del
// texto hijo de <script> y rompería el JSON. El contenido es estático, de config.
const JSON_LD = JSON.stringify(DATOS_ESTRUCTURADOS).replace(/</g, "\\u003c");

export const viewport: Viewport = {
  // Barra del navegador en azul profundo, a juego con el header.
  themeColor: "#0B1B33",
  width: "device-width",
  initialScale: 1,
  // El contenido llega hasta los bordes del iPhone; los márgenes seguros se
  // compensan con env(safe-area-inset-*) en globals.css.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${fuenteDisplay.variable} ${fuenteCuerpo.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
        {/* El carrito vive en localStorage y su contador se lee desde el
            header, así que el proveedor envuelve todo el árbol. */}
        <ProveedorCarrito>{children}</ProveedorCarrito>
        {/* Métricas de rendimiento reales (Core Web Vitals) en Vercel. */}
        <SpeedInsights />
      </body>
    </html>
  );
}
