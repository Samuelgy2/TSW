import { CONTACTO, SITIO } from "@/config/sitio";

/**
 * Franja delgada sobre el header. Es el único sitio donde el rojo hace de fondo
 * en toda la cabecera, y por eso va con texto blanco: 4.9:1 de contraste.
 *
 * Oculta en móvil: allí cada píxel de alto cuenta y el contacto está en el
 * footer y en el menú.
 */
export function BarraSuperior() {
  return (
    <div className="hidden bg-rojo text-blanco md:block">
      <div className="contenedor flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2 text-sm">
        <p className="font-semibold uppercase tracking-wide">{SITIO.lema}</p>

        <ul className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <li>
            <a
              href={`tel:${CONTACTO.telefono.replace(/[^\d+]/g, "")}`}
              className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blanco"
            >
              {CONTACTO.telefono}
            </a>
          </li>
          <li>
            <a
              href={`mailto:${CONTACTO.correo}`}
              className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blanco"
            >
              {CONTACTO.correo}
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
