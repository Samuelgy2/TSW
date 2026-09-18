import Link from "next/link";

import { CONTACTO, ENLACES_LEGALES, NAVEGACION, REDES, SITIO } from "@/config/sitio";

export function Footer() {
  const anio = new Date().getFullYear();

  return (
    <footer className="bg-azul-profundo text-blanco">
      <div className="contenedor grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-3xl">TSW</p>
          <p className="mt-3 text-sm text-blanco/70">{SITIO.nombreLargo}</p>
          <p className="mt-1 text-sm text-blanco/70">{SITIO.lema}</p>
        </div>

        <nav aria-label="Secciones">
          <h2 className="text-sm uppercase tracking-widest text-blanco/60">Secciones</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {NAVEGACION.map((enlace) => (
              <li key={enlace.href}>
                <Link
                  href={enlace.href}
                  className="inline-flex min-h-[44px] items-center text-blanco/85 underline-offset-4 hover:text-blanco hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
                >
                  {enlace.etiqueta}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/matriculas"
                className="inline-flex min-h-[44px] items-center text-blanco/85 underline-offset-4 hover:text-blanco hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
              >
                Matrículas
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="text-sm uppercase tracking-widest text-blanco/60">Contacto</h2>
          <address className="mt-4 flex flex-col gap-2 not-italic text-blanco/85">
            <span>{CONTACTO.direccion}</span>
            <span>{CONTACTO.ciudad}</span>
            <a
              href={`tel:${CONTACTO.telefono.replace(/[^\d+]/g, "")}`}
              className="inline-flex min-h-[44px] items-center underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
            >
              {CONTACTO.telefono}
            </a>
            <a
              href={`mailto:${CONTACTO.correo}`}
              className="inline-flex min-h-[44px] items-center underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
            >
              {CONTACTO.correo}
            </a>
            <span className="text-blanco/70">{CONTACTO.horario}</span>
          </address>
        </div>

        <div>
          <h2 className="text-sm uppercase tracking-widest text-blanco/60">Síguenos</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {REDES.map((red) => (
              <li key={red.nombre}>
                <a
                  href={red.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-h-[44px] items-center text-blanco/85 underline-offset-4 hover:text-blanco hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
                >
                  {red.nombre}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-blanco/10">
        <div className="contenedor flex flex-col gap-4 py-6 text-sm text-blanco/70 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {anio} {SITIO.nombreLargo}. Todos los derechos reservados.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {ENLACES_LEGALES.map((enlace) => (
              <li key={enlace.href}>
                <Link
                  href={enlace.href}
                  className="inline-flex min-h-[44px] items-center underline-offset-4 hover:text-blanco hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
                >
                  {enlace.etiqueta}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
