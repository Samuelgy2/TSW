import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
  // Orígenes permitidos para los recursos de /_next/* en desarrollo. Hacen
  // falta cuando el sitio se abre desde otro dispositivo de la red local
  // —el móvil, por ejemplo— en vez de localhost.
  allowedDevOrigins: ["192.168.13.1", "localhost", "127.0.0.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        // Storage de Supabase: imágenes de productos y competencias.
        hostname: "[REF-PROYECTO].supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
