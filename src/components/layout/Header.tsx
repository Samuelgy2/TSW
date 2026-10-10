"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

import { useTrampaFoco } from "@/lib/accesibilidad/trampaFoco";
import type { ClubMenu } from "@/features/clubes/types";
import { AnimatePresence, motion, useMovimientoReducido } from "@/lib/animaciones";
import { NAVEGACION, SITIO, type EnlaceNav } from "@/config/sitio";
import { useCarrito } from "@/features/pedidos/carrito";
import { cn } from "@/lib/utils";

/**
 * Dónde se inserta «Clubes» en la barra: después de «Corporación» y antes de
 * «Semilleros», porque los niveles cuelgan de un club y se lee en ese orden.
 */
const POSICION_CLUBES = 1;

/**
 * La entrada «Clubes» se arma con lo que hay en la base, no con una lista
 * escrita aquí: el administrador da de alta clubes desde el panel y el menú
 * tiene que seguirlo sin un despliegue. Sin clubes activos la entrada no
 * aparece, en vez de quedar un desplegable vacío.
 */
function navegacionConClubes(clubes: ClubMenu[]): EnlaceNav[] {
  if (clubes.length === 0) return NAVEGACION;

  const entrada: EnlaceNav = {
    etiqueta: "Clubes",
    href: "/semilleros",
    submenu: clubes.map((club) => ({
      etiqueta: club.nombre,
      href: `/semilleros/${club.slug}`,
      descripcion: club.etiqueta ?? (club.tipo === "programa" ? "Programa" : "Club"),
    })),
  };

  return [...NAVEGACION.slice(0, POSICION_CLUBES), entrada, ...NAVEGACION.slice(POSICION_CLUBES)];
}

/** Cabecera azul profundo, pegada arriba, con submenú y menú móvil a pantalla completa. */
export function Header({ clubes }: { clubes: ClubMenu[] }) {
  // ponytail: cuando Vercel regenera la portada por revalidatePath (guardados del
  // panel), Next la renderiza con la ruta interna "/index" (payload "c":["","index"])
  // y el navegador hidrata en "/": "Corporación" no salía activa en el servidor y
  // React lanzaba el #418. Se normaliza aquí; quitarlo si una versión de Next deja
  // de exponer "/index" en usePathname.
  const crudo = usePathname();
  const ruta = crudo === "/index" ? "/" : crudo;
  const navegacion = useMemo(() => navegacionConClubes(clubes), [clubes]);
  const [menuMovil, setMenuMovil] = useState(false);
  const [submenuAbierto, setSubmenuAbierto] = useState<string | null>(null);
  const reducido = useMovimientoReducido();
  const zonaSubmenu = useRef<HTMLUListElement>(null);
  // Al cerrar con Escape el foco tiene que volver al disparador, no perderse
  // al principio de la página.
  const disparadores = useRef(new Map<string, HTMLButtonElement | null>());

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

  /**
   * Teclado del desplegable, patrón de divulgación con navegación por
   * flechas: abajo y arriba recorren en ciclo, Inicio y Fin saltan a los
   * extremos, Escape cierra devolviendo el foco al disparador y el tabulador
   * lo cierra al salir. Sin esto el desplegable solo se recorre con Tab, que
   * funciona pero no es lo que espera quien navega con teclado.
   */
  function alTeclearSubmenu(evento: ReactKeyboardEvent<HTMLElement>, etiqueta: string) {
    const contenedor = evento.currentTarget.closest("li");
    const opciones = [...(contenedor?.querySelectorAll<HTMLAnchorElement>('[data-submenu] a') ?? [])];
    const indice = opciones.indexOf(document.activeElement as HTMLAnchorElement);

    switch (evento.key) {
      case "ArrowDown":
        evento.preventDefault();
        if (submenuAbierto !== etiqueta) {
          setSubmenuAbierto(etiqueta);
          // El panel aún no está en el DOM: el foco espera al siguiente marco.
          requestAnimationFrame(() => {
            contenedor?.querySelector<HTMLAnchorElement>('[data-submenu] a')?.focus();
          });
          return;
        }
        opciones[(indice + 1) % opciones.length]?.focus();
        return;
      case "ArrowUp":
        evento.preventDefault();
        if (submenuAbierto !== etiqueta) return;
        opciones[(indice - 1 + opciones.length) % opciones.length]?.focus();
        return;
      case "Home":
        if (submenuAbierto !== etiqueta) return;
        evento.preventDefault();
        opciones[0]?.focus();
        return;
      case "End":
        if (submenuAbierto !== etiqueta) return;
        evento.preventDefault();
        opciones[opciones.length - 1]?.focus();
        return;
      case "Escape":
        if (submenuAbierto !== etiqueta) return;
        evento.preventDefault();
        setSubmenuAbierto(null);
        disparadores.current.get(etiqueta)?.focus();
        return;
      case "Tab":
        // Salir con el tabulador cierra: dejarlo abierto taparía lo que hay
        // debajo mientras el foco ya está en otra parte.
        if (indice === opciones.length - 1 && !evento.shiftKey) setSubmenuAbierto(null);
        return;
      default:
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-blanco/10 bg-azul-profundo text-blanco">
      <div className="contenedor flex h-16 items-center justify-between gap-4 lg:h-20">
        <Link
          href="/"
          className="flex min-h-[44px] items-center gap-3 font-display text-2xl tracking-tight focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
        >
          {/* Logo de la corporación (SITIO.logo, un archivo en /public): es del
              sitio, no de un club, así que no sale de la tabla `club`. Decorativo:
              el enlace ya se nombra con "TSW". Sin archivo, el hueco reserva sus
              medidas para que la cabecera no se recoloque cuando llegue. */}
          {SITIO.logo ? (
            <Image
              src={SITIO.logo}
              alt=""
              width={40}
              height={40}
              priority
              className="h-10 w-10 shrink-0 rounded-full object-contain"
            />
          ) : (
            <span
              aria-hidden="true"
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-blanco/25 text-[10px] font-normal tracking-normal text-blanco/60 sm:flex"
            >
              logo
            </span>
          )}
          <span className="flex items-center">
            TSW
            <span className="ml-2 hidden text-xs font-normal uppercase tracking-[0.2em] text-blanco/60 sm:inline">
              {SITIO.subtitulo}
            </span>
          </span>
        </Link>

        {/* --- Navegación de escritorio ------------------------------------ */}
        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1" ref={zonaSubmenu}>
            {navegacion.map((enlace) => {
              if (!enlace.submenu) {
                return (
                  <li key={enlace.href}>
                    <Link
                      href={enlace.href}
                      aria-current={activa(enlace.href) ? "page" : undefined}
                      className={cn(
                        "relative flex min-h-[44px] items-center px-4 font-semibold transition-colors hover:text-blanco",
                        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco",
                        activa(enlace.href) ? "text-blanco" : "text-blanco/75",
                      )}
                    >
                      {enlace.etiqueta}
                      {activa(enlace.href) && (
                        <span className="absolute inset-x-3 bottom-3 h-[3px] bg-acento" aria-hidden="true" />
                      )}
                    </Link>
                  </li>
                );
              }

              const abierto = submenuAbierto === enlace.etiqueta;
              return (
                <li key={enlace.etiqueta} className="relative" onKeyDown={(e) => alTeclearSubmenu(e, enlace.etiqueta)}>
                  <button
                    type="button"
                    ref={(n) => {
                      disparadores.current.set(enlace.etiqueta, n);
                    }}
                    aria-expanded={abierto}
                    aria-controls={`submenu-${enlace.etiqueta}`}
                    onClick={() => setSubmenuAbierto(abierto ? null : enlace.etiqueta)}
                    className={cn(
                      "flex min-h-[44px] items-center gap-2 px-4 font-semibold transition-colors",
                      "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco",
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
                        data-submenu
                        className="absolute left-0 top-full w-80 rounded-b-lg border border-blanco/10 bg-azul-medio p-2 shadow-xl"
                      >
                        <ul>
                          {enlace.submenu.map((sub) => (
                            <li key={sub.href}>
                              <Link
                                href={sub.href}
                                className="block rounded-md p-3 transition-colors hover:bg-blanco/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
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
          {/* El enlace "Mi cuenta" vuelve cuando se habiliten las cuentas de usuario (CUENTAS_HABILITADAS). */}
          <EnlaceCarrito />

          <button
            type="button"
            onClick={() => setMenuMovil(true)}
            aria-expanded={menuMovil}
            aria-controls="menu-movil"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-blanco transition-colors hover:bg-blanco/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco lg:hidden"
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              ☰
            </span>
            <span className="sr-only">Abrir menú</span>
          </button>
        </div>
      </div>

      <MenuMovil
        abierto={menuMovil}
        alCerrar={() => setMenuMovil(false)}
        rutaActiva={ruta}
        navegacion={navegacion}
      />
    </header>
  );
}

/** Enlace al carrito con el contador de unidades. */
function EnlaceCarrito() {
  const { unidades, cargado } = useCarrito();

  return (
    <Link
      href="/carrito"
      className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md px-3 font-semibold text-blanco transition-colors hover:bg-blanco/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
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
          className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-acento px-1 text-xs font-bold text-azul-profundo"
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
  navegacion,
}: {
  abierto: boolean;
  alCerrar: () => void;
  rutaActiva: string;
  navegacion: EnlaceNav[];
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
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-blanco hover:bg-blanco/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
            >
              <span aria-hidden="true" className="text-3xl leading-none">
                ×
              </span>
              <span className="sr-only">Cerrar menú</span>
            </button>
          </div>

          <nav aria-label="Principal (móvil)" className="contenedor flex-1 overflow-y-auto py-6">
            <ul className="flex flex-col gap-1">
              {navegacion.map((enlace) => (
                <li key={enlace.etiqueta}>
                  <Link
                    href={enlace.href}
                    aria-current={rutaActiva === enlace.href ? "page" : undefined}
                    className="flex min-h-[56px] items-center border-b border-blanco/10 font-display text-2xl text-blanco focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
                  >
                    {enlace.etiqueta}
                  </Link>

                  {enlace.submenu && (
                    <ul className="mb-2 flex flex-col">
                      {enlace.submenu.map((sub) => (
                        <li key={sub.href}>
                          <Link
                            href={sub.href}
                            className="flex min-h-[48px] items-center pl-4 text-blanco/75 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
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
                  className="flex min-h-[56px] items-center border-b border-blanco/10 font-display text-2xl text-blanco focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
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
