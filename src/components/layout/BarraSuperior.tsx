import { CONTACTO, SITIO, enlaceTelefono } from "@/config/sitio";
import { enlaceWhatsApp } from "@/lib/whatsapp";

/**
 * Franja delgada sobre el header, con lo que pide el documento de la cliente
 * para la barra superior: lema, WhatsApp y correo. Es el único sitio donde el
 * acento hace de fondo en toda la cabecera, y por eso va con texto blanco:
 * 4.9:1 de contraste.
 *
 * Oculta en móvil: allí cada píxel de alto cuenta, el lema es largo y el
 * contacto está en el footer y en el menú.
 */
export function BarraSuperior() {
  // El documento fija los botones de WhatsApp del sitio en un número concreto,
  // que vive en la variable de entorno. Si no está configurada, el enlace no se
  // inventa: queda el `tel:` del mismo número, que también sirve para llamar.
  const whatsapp = enlaceWhatsApp();

  return (
    // data-nosnippet: Google no toma el lema ni el contacto como fragmento del resultado.
    <div data-nosnippet className="hidden bg-acento-oscuro text-blanco md:block">
      <div className="contenedor flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2 text-sm">
        <p className="min-w-0 font-semibold">{SITIO.lema}</p>

        <ul className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <li>
            <a
              href={whatsapp ?? enlaceTelefono(CONTACTO.telefono)}
              {...(whatsapp ? { target: "_blank", rel: "noreferrer noopener" } : {})}
              className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blanco"
            >
              WhatsApp {CONTACTO.telefono}
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
