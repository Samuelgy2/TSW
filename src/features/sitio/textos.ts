/**
 * Interpolación mínima para textos que llevan un marcador `{nombre}`.
 *
 * Existe por una sola razón: `MATRICULAS.categoriasBajada` era una función
 * `(deporte: string) => string` hasta que la sección pasó a guardarse como
 * jsonb en `contenido_sitio` (migración 19) y una función dejó de ser
 * serializable. Se convirtió en una plantilla de texto con el marcador
 * `{deporte}`, y esto hace el reemplazo en el punto de uso.
 */
export function interpolar(plantilla: string, valores: Record<string, string>): string {
  return plantilla.replace(/\{(\w+)\}/g, (coincidencia, clave: string) => valores[clave] ?? coincidencia);
}
