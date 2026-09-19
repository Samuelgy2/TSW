import path from "node:path";

import type { NextConfig } from "next";

const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321");

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
