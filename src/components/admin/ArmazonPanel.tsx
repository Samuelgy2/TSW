"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { useTrampaFoco } from "@/lib/accesibilidad/trampaFoco";
import { AnimatePresence, motion, useMovimientoReducido } from "@/lib/animaciones";
import { Boton, type OpcionDeporte } from "@/components/ui";
import { SECCIONES_PANEL } from "@/config/panel";
import { cerrarSesion } from "@/features/admin/acciones";
import { CabeceraDeporte } from "@/components/admin/CabeceraDeporte";
import { cn } from "@/lib/utils";

/**
 * Armazón del panel: barra lateral azul profundo con las secciones, correo
 * del usuario y cierre de sesión. Desde `lg` es una columna fija; por debajo,
 * una barra superior de 64px con hamburguesa y un cajón lateral con el foco
 * atrapado, cierre con Escape y con toque fuera.
 *
 * Con el cambio de alcance multideporte lleva también el SelectorDeporte,
 * visible en escritorio y en el cajón móvil. `deporte` y `deportes` llegan del
 * servidor (cookie tsw.deporte y tabla `deporte`, incluidos los inactivos con
 * su marca, más "Marca TSW (todos)"); por ahora es solo un filtro visual: no
 * filtra consultas porque las demás tablas aún no llevan deporte_id.
 */
export function ArmazonPanel({
  correo,
  deporte,
  deportes,
  children,
}: {
  correo: string;
  /** Deporte activo leído de la cookie en el servidor. */
  deporte: { id: string; nombre: string };
  /** Opciones del selector. */
  deportes: OpcionDeporte[];
  children: ReactNode;
}) {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const reducido = useMovimientoReducido();
  const cajon = useRef<HTMLDivElement>(null);
  useTrampaFoco(cajon, abierto);

  // Cambiar de sección cierra el cajón.
  useEffect(() => setAbierto(false), [ruta]);

  useEffect(() => {
    if (!abierto) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAbierto(false);
    }
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  return (
    <div className="min-h-svh bg-gris-frio lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      {/* --- Barra superior (móvil y tablet) ------------------------------ */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-blanco/10 bg-azul-profundo px-4 text-blanco lg:hidden">
        <Link
          href="/admin"
          className="flex min-h-[44px] items-center font-display text-xl focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
        >
          TSW
          <span className="ml-2 text-xs font-normal uppercase tracking-[0.2em] text-blanco/60">Panel</span>
        </Link>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-expanded={abierto}
          aria-controls="menu-panel"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md hover:bg-blanco/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
        >
          <span aria-hidden="true" className="text-2xl leading-none">
            ☰
          </span>
          <span className="sr-only">Abrir menú del panel</span>
        </button>
      </header>

      {/* --- Barra lateral (escritorio) ---------------------------------- */}
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col">
        <Navegacion ruta={ruta} correo={correo} deporte={deporte} deportes={deportes} />
      </aside>

      {/* --- Cajón lateral (móvil y tablet) -------------------------------- */}
      <AnimatePresence>
        {abierto && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              aria-hidden="true"
              onClick={() => setAbierto(false)}
              className="absolute inset-0 bg-azul-profundo/70"
              initial={reducido ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reducido ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div
              ref={cajon}
              id="menu-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Menú del panel"
              className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col"
              initial={reducido ? false : { x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={reducido ? undefined : { x: -24, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Navegacion
                ruta={ruta}
                correo={correo}
                deporte={deporte}
                deportes={deportes}
                alCerrar={() => setAbierto(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Navegacion({
  ruta,
  correo,
  deporte,
  deportes,
  alCerrar,
}: {
  ruta: string;
  correo: string;
  deporte: { id: string; nombre: string };
  deportes: OpcionDeporte[];
  alCerrar?: () => void;
}) {
  const activa = (href: string) => (href === "/admin" ? ruta === "/admin" : ruta.startsWith(href));

  return (
    <div className="flex h-full w-full flex-col bg-azul-profundo text-blanco">
      <div className="flex h-16 items-center justify-between gap-2 px-5">
        <Link
          href="/admin"
          className="flex min-h-[44px] items-center font-display text-xl focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
        >
          TSW
          <span className="ml-2 text-xs font-normal uppercase tracking-[0.2em] text-blanco/60">Panel</span>
        </Link>
        {alCerrar && (
          <button
            type="button"
            onClick={alCerrar}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md hover:bg-blanco/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              ×
            </span>
            <span className="sr-only">Cerrar menú</span>
          </button>
        )}
      </div>

      {/* Selector de deporte: en todas las secciones, encima de la navegación. */}
      <div className="px-4 pb-3">
        <CabeceraDeporte deportes={deportes} valor={deporte.id} />
        <p className="mt-2 text-xs text-blanco/60">
          Administrando: <span className="font-semibold text-blanco/85">{deporte.nombre}</span>
        </p>
      </div>

      <nav aria-label="Secciones del panel" className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="flex flex-col gap-1">
          {SECCIONES_PANEL.map((seccion) => {
            const actual = activa(seccion.href);
            return (
              <li key={seccion.href}>
                <Link
                  href={seccion.href}
                  aria-current={actual ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-[44px] items-center rounded-md px-3 font-semibold transition-colors",
                    "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco",
                    actual ? "bg-blanco/10 text-blanco" : "text-blanco/75 hover:bg-blanco/5 hover:text-blanco",
                  )}
                >
                  {actual && (
                    <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-acento" />
                  )}
                  {seccion.etiqueta}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-blanco/10 p-4">
        <p className="truncate text-sm text-blanco/70" title={correo}>
          {correo}
        </p>
        <form action={cerrarSesion} className="mt-3">
          <Boton type="submit" variante="secundario" fondo="oscuro" tamano="sm" completo>
            Cerrar sesión
          </Boton>
        </form>
        <Link
          href="/"
          className="mt-3 inline-flex min-h-[44px] items-center text-sm text-blanco/70 underline-offset-4 hover:text-blanco hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
        >
          Ver el sitio público
        </Link>
      </div>
    </div>
  );
}
