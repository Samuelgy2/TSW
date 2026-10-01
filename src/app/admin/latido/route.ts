/**
 * Latido del panel. No hace nada: el middleware ya validó la sesión y renovó la
 * cookie de actividad antes de llegar aquí. Existe para que el navegador
 * pueda decir «sigo aquí» mientras alguien lee sin hacer peticiones.
 */
export function POST() {
  return new Response(null, { status: 204 });
}
