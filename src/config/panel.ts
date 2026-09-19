/** Secciones del panel de administración, en el orden de la barra lateral. */
export type SeccionPanel = {
  href: string;
  etiqueta: string;
  /** Texto corto bajo el título en el encabezado de la sección. */
  descripcion: string;
};

export const SECCIONES_PANEL: SeccionPanel[] = [
  { href: "/admin", etiqueta: "Inicio", descripcion: "Resumen del sitio y últimos cambios." },
  { href: "/admin/documentos", etiqueta: "Documentos", descripcion: "Formatos de matrícula y sus versiones." },
  { href: "/admin/competencias", etiqueta: "Competencias", descripcion: "Calendario, resultados y publicación." },
  { href: "/admin/niveles", etiqueta: "Niveles", descripcion: "Semilleros y niveles de formación." },
  { href: "/admin/productos", etiqueta: "Productos", descripcion: "Catálogo, tallas, precios e inventario." },
  { href: "/admin/pedidos", etiqueta: "Pedidos", descripcion: "Pedidos de la tienda y su estado." },
  { href: "/admin/bitacora", etiqueta: "Bitácora", descripcion: "Quién cambió qué y cuándo." },
];

export function seccionDeRuta(ruta: string): SeccionPanel | undefined {
  return SECCIONES_PANEL.find((s) => (s.href === "/admin" ? ruta === "/admin" : ruta.startsWith(s.href)));
}
