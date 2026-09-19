"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useTrampaFoco } from "@/lib/accesibilidad/trampaFoco";
import { AnimatePresence, motion, useMovimientoReducido } from "@/lib/animaciones";
import { NAVEGACION } from "@/config/sitio";
import { useCarrito } from "@/features/pedidos/carrito";
import { cn } from "@/lib/utils";

/** Cabecera azul profundo, pegada arriba, con submenú y menú móvil a pantalla completa. */
export function Header() {
  const ruta = usePathname();
  const [menuMovil, setMenuMovil] = useState(false);
  const [submenuAbierto, setSubmenuAbierto] = useState<string | null>(null);
  const reducido = useMovimientoReducido();
  const zonaSubmenu = useRef<HTMLUListElement>(null);

  // Cambiar de página cierra todo lo que estuviera desplegado.
  useEffect(() => {
    setMenuMovil(false);
    setSubmenuAbierto(null);
  }, [ruta]);

  // El menú móvil ocupa la pantalla: el fondo no debe hacer scroll detrás.
  useEffect(() => {
    if (!menuMovil) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [menuMovil]);

  useEffect(() => {
    function alTeclear(evento: KeyboardEvent) {
      if (evento.key !== "Escape") return;
      setSubmenuAbierto(null);
      setMenuMovil(false);
    }
    function alClicFuera(evento: MouseEvent) {
      if (!zonaSubmenu.current?.contains(evento.target as Node)) setSubmenuAbierto(null);
    }
    document.addEventListener("keydown", alTeclear);
    document.addEventListener("mousedown", alClicFuera);
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.removeEventListener("mousedown", alClicFuera);
    };
  }, []);

  const activa = (href: string) => ruta === href || ruta.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-blanco/10 bg-azul-profundo text-blanco">
      <div className="contenedor flex h-16 items-center justify-between gap-4 lg:h-20">
        <Link
          href="/"
          className="flex min-h-[44px] items-center font-display text-2xl tracking-tight focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
        >
          TSW
          <span className="ml-2 hidden text-xs font-normal uppercase tracking-[0.2em] text-blanco/60 sm:inline">
            BMX
          </span>
        </Link>

        {/* --- Navegación de escritorio ------------------------------------ */}
        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1" ref={zonaSubmenu}>
            {NAVEGACION.map((enlace) => {
              if (!enlace.submenu) {
                return (
                  <li key={enlace.href}>
                    <Link
                      href={enlace.href}
                      aria-current={activa(enlace.href) ? "page" : undefined}
                      className={cn(
                        "relative flex min-h-[44px] items-center px-4 font-semibold transition-colors hover:text-blanco",
                        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo",
                        activa(enlace.href) ? "text-blanco" : "text-blanco/75",
                      )}
                    >
                      {enlace.etiqueta}
                      {activa(enlace.href) && (
                        <span className="absolute inset-x-3 bottom-3 h-[3px] bg-rojo" aria-hidden="true" />
                      )}
                    </Link>
                  </li>
                );
              }

              const abierto = submenuAbierto === enlace.etiqueta;
              return (
                <li key={enlace.etiqueta} className="relative">
                  <button
                    type="button"
                    aria-expanded={abierto}
                    aria-controls={`submenu-${enlace.etiqueta}`}
                    onClick={() => setSubmenuAbierto(abierto ? null : enlace.etiqueta)}
                    className={cn(
                      "flex min-h-[44px] items-center gap-2 px-4 font-semibold transition-colors",
                      "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo",
                      abierto || activa(enlace.href) ? "text-blanco" : "text-blanco/75 hover:text-blanco",
                    )}
                  >
                    {enlace.etiqueta}
                    <span
                      aria-hidden="true"
                      className={cn("text-xs transition-transform duration-200", abierto && "rotate-180")}
                    >
                      ▾
                    </span>
                  </button>

                  <AnimatePresence>
                    {abierto && (
                      <motion.div
                        id={`submenu-${enlace.etiqueta}`}
                        initial={reducido ? false : { opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reducido ? undefined : { opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                        className="absolute left-0 top-full w-80 rounded-b-lg border border-blanco/10 bg-azul-medio p-2 shadow-xl"
                      >
                        <ul>
                          {enlace.submenu.map((sub) => (
                            <li key={sub.href}>
                              <Link
                                href={sub.href}
                                className="block rounded-md p-3 transition-colors hover:bg-blanco/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
                              >
                                <span className="block font-semibold">{sub.etiqueta}</span>
                                <span className="mt-0.5 block text-sm text-blanco/70">
                                  {sub.descripcion}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <EnlaceCarrito />

          <button
            type="button"
            onClick={() => setMenuMovil(true)}
            aria-expanded={menuMovil}
            aria-controls="menu-movil"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-blanco transition-colors hover:bg-blanco/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo lg:hidden"
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              ☰
            </span>
            <span className="sr-only">Abrir menú</span>
          </button>
        </div>
      </div>

      <MenuMovil abierto={menuMovil} alCerrar={() => setMenuMovil(false)} rutaActiva={ruta} />
    </header>
  );
}

/** Enlace al carrito con el contador de unidades. */
function EnlaceCarrito() {
  const { unidades, cargado } = useCarrito();

  return (
    <Link
      href="/carrito"
      className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md px-3 font-semibold text-blanco transition-colors hover:bg-blanco/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
    >
      <span aria-hidden="true" className="text-xl leading-none">
        🛒
      </span>
      <span className="sr-only">
        Carrito{cargado && unidades > 0 ? `, ${unidades} artículo${unidades === 1 ? "" : "s"}` : " vacío"}
      </span>
      {cargado && unidades > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rojo px-1 text-xs font-bold text-blanco"
        >
          {unidades}
        </span>
      )}
    </Link>
  );
}

/**
 * Menú de pantalla completa en móvil. Mientras está abierto el foco queda
 * atrapado dentro; Escape lo cierra (lo escucha el Header) y al cerrarse el
 * foco vuelve al botón de hamburguesa.
 */
function MenuMovil({
  abierto,
  alCerrar,
  rutaActiva,
}: {
  abierto: boolean;
  alCerrar: () => void;
  rutaActiva: string;
}) {
  const reducido = useMovimientoReducido();
  const panel = useRef<HTMLDivElement>(null);
  useTrampaFoco(panel, abierto);

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label="Menú principal"
          id="menu-movil"
          initial={reducido ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducido ? undefined : { opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex flex-col bg-azul-profundo lg:hidden"
        >
          <div className="contenedor flex h-16 items-center justify-between">
            <span className="font-display text-2xl text-blanco">TSW</span>
            <button
              type="button"
              onClick={alCerrar}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-blanco hover:bg-blanco/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
            >
              <span aria-hidden="true" className="text-3xl leading-none">
                ×
              </span>
              <span className="sr-only">Cerrar menú</span>
            </button>
          </div>

          <nav aria-label="Principal (móvil)" className="contenedor flex-1 overflow-y-auto py-6">
            <ul className="flex flex-col gap-1">
              {NAVEGACION.map((enlace) => (
                <li key={enlace.etiqueta}>
                  <Link
                    href={enlace.href}
                    aria-current={rutaActiva === enlace.href ? "page" : undefined}
                    className="flex min-h-[56px] items-center border-b border-blanco/10 font-display text-2xl text-blanco focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
                  >
                    {enlace.etiqueta}
                  </Link>

                  {enlace.submenu && (
                    <ul className="mb-2 flex flex-col">
                      {enlace.submenu.map((sub) => (
                        <li key={sub.href}>
                          <Link
                            href={sub.href}
                            className="flex min-h-[48px] items-center pl-4 text-blanco/75 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
                          >
                            {sub.etiqueta}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
              <li>
                <Link
                  href="/carrito"
                  className="flex min-h-[56px] items-center border-b border-blanco/10 font-display text-2xl text-blanco focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
                >
                  Carrito
                </Link>
              </li>
            </ul>
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
