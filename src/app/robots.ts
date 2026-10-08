import type { MetadataRoute } from "next";

import { URL_SITIO } from "@/config/sitio";

/**
 * Qué puede rastrear un buscador. Lo privado (paneles, sesión, API y
 * callbacks de correo) se excluye aquí Y lleva `noindex` en su propia
 * metadata: robots.txt solo pide no rastrear, no impide que una URL enlazada
 * aparezca en resultados.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/cuenta", "/carrito", "/api", "/auth", "/laboratorio"],
    },
    sitemap: `${URL_SITIO}/sitemap.xml`,
  };
}
