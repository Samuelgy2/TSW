import path from "node:path";

import type { NextConfig } from "next";

const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Carpeta de salida, configurable para que los chequeos no peleen con el
  // servidor de desarrollo de Samuel: si los dos escriben en `.next`, el `next
  // dev` de un chequeo invalida el build de producción del otro y al revés.
  // Los scripts de verificación la fijan a `.next-verificar*`; sin la variable,
  // `.next` de siempre.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // Fija la raíz del proyecto: sin esto Next puede tomar un lockfile de un
  // directorio superior como raíz del workspace.
  outputFileTracingRoot: path.join(import.meta.dirname, "./"),
  typescript: {
    // Nunca ignorar errores de tipos en build: el proyecto es estricto.
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Sin `serverActions.bodySizeLimit`: se queda en el 1 MB por defecto. Los
  // archivos ya no pasan por Server Actions —van directo a Storage con URL
  // firmada (features/admin/subida-directa.ts)—, y subir el tope no servía de
  // nada en Vercel, que corta el cuerpo de una función en 4,5 MB igual.
  // Orígenes permitidos para los recursos de /_next/* en desarrollo. Hacen
  // falta cuando el sitio se abre desde otro dispositivo de la red local
  // —el móvil, por ejemplo— en vez de localhost.
  allowedDevOrigins: ["192.168.13.1", "localhost", "127.0.0.1"],
  // Cabeceras de seguridad en todas las rutas. Sin iframes en el sitio, así que
  // DENY no rompe nada. Falta la CSP: Next inyecta scripts en línea y pide
  // nonces; se añade aparte, empezando en modo Report-Only.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
  images: {
    // Storage de Supabase: imágenes de productos y competencias. El host sale
    // de la URL configurada, así sirve igual con el proyecto enlazado que con
    // el stack local (http://127.0.0.1:54321).
    remotePatterns: [
      {
        protocol: supabaseUrl.protocol.replace(":", "") as "http" | "https",
        hostname: supabaseUrl.hostname,
        port: supabaseUrl.port,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
