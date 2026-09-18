import type { Metadata, Viewport } from "next";
import { Archivo_Black, Barlow } from "next/font/google";

import { ProveedorCarrito } from "@/features/pedidos/carrito";
import { SITIO } from "@/config/sitio";

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
    default: "TSW — Escuela de BMX",
    template: "%s | TSW",
  },
  description: SITIO.descripcion,
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

export const viewport: Viewport = {
  themeColor: "#0B1B33",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${fuenteDisplay.variable} ${fuenteCuerpo.variable}`}>
      <body>
        {/* El carrito vive en localStorage y su contador se lee desde el
            header, así que el proveedor envuelve todo el árbol. */}
        <ProveedorCarrito>{children}</ProveedorCarrito>
      </body>
    </html>
  );
}
