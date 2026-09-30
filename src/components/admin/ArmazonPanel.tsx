"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { useTrampaFoco } from "@/lib/accesibilidad/trampaFoco";
import { AnimatePresence, motion, useMovimientoReducido } from "@/lib/animaciones";
import { Boton, type OpcionDeporte } from "@/components/ui";
import { GRUPOS_PANEL, SECCIONES_PANEL } from "@/config/panel";
import { cerrarSesion } from "@/features/admin/acciones";
import { CabeceraDeporte } from "@/components/admin/CabeceraDeporte";
import { cn } from "@/lib/utils";

const CLAVE_GRUPOS = "tsw.panel.grupos";

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
  const inicio = SECCIONES_PANEL.find((s) => s.href === "/admin")!;
  const idBase = useId();
  const grupoActivo = GRUPOS_PANEL.find((g) => g.hrefs.some(activa))?.id;

  // El grupo de la ruta activa arranca abierto (también en el primer render del
  // servidor, para que no se anime al cargar); el resto se recupera del navegador.
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>(() => (grupoActivo ? { [grupoActivo]: true } : {}));

  useEffect(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(CLAVE_GRUPOS) ?? "{}");
      if (guardado && typeof guardado === "object") setAbiertos((a) => ({ ...guardado, ...a }));
    } catch {
      // Sin almacenamiento o JSON roto: se queda el estado por defecto.
    }
  }, []);

  // Navegar a una ruta de otro grupo lo abre solo.
  useEffect(() => {
    if (grupoActivo) setAbiertos((a) => (a[grupoActivo] ? a : { ...a, [grupoActivo]: true }));
  }, [grupoActivo]);

  function alternar(id: string) {
    const siguiente = { ...abiertos, [id]: !abiertos[id] };
    setAbiertos(siguiente);
    try {
      localStorage.setItem(CLAVE_GRUPOS, JSON.stringify(siguiente));
    } catch {
      // Sin almacenamiento: el estado vale solo para esta visita.
    }
  }

  const clasesEnlace = (actual: boolean) =>
    cn(
      "relative flex min-h-[44px] items-center rounded-md px-3 font-semibold transition-colors",
      "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco",
      actual ? "bg-blanco/10 text-blanco" : "text-blanco/75 hover:bg-blanco/5 hover:text-blanco",
    );
  const indicador = <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-acento" />;

  return (
    <div className="flex h-full w-full flex-col bg-azul-profundo text-blanco">
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-5">
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
      <div className="shrink-0 px-4 pb-3">
        <CabeceraDeporte deportes={deportes} valor={deporte.id} />
        <p className="mt-2 text-xs text-blanco/60">
          Administrando: <span className="font-semibold text-blanco/85">{deporte.nombre}</span>
        </p>
      </div>

      {/* Solo esta zona se desplaza, y solo si con todo abierto no cabe. */}
      <nav
        aria-label="Secciones del panel"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 [scrollbar-color:rgb(255_255_255/0.25)_transparent] [scrollbar-width:thin]"
      >
        <ul className="flex flex-col gap-1">
          <li>
            <Link href={inicio.href} aria-current={activa(inicio.href) ? "page" : undefined} className={clasesEnlace(activa(inicio.href))}>
              {activa(inicio.href) && indicador}
              {inicio.etiqueta}
            </Link>
          </li>
          {GRUPOS_PANEL.map((grupo) => {
            const abierto = Boolean(abiertos[grupo.id]);
            const idLista = `${idBase}-${grupo.id}`;
            return (
              <li key={grupo.id}>
                <button
                  type="button"
                  onClick={() => alternar(grupo.id)}
                  aria-expanded={abierto}
                  aria-controls={idLista}
                  className="flex min-h-[44px] w-full items-center justify-between rounded-md px-3 text-left text-xs font-bold uppercase tracking-[0.15em] text-blanco/60 transition-colors hover:bg-blanco/5 hover:text-blanco focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
                >
                  {grupo.etiqueta}
                  <span
                    aria-hidden="true"
                    className={cn("text-base leading-none transition-transform duration-200 motion-reduce:transition-none", abierto && "rotate-180")}
                  >
                    ⌄
                  </span>
                </button>
                {/* 0fr→1fr anima la altura sin medirla; `invisible` saca los enlaces cerrados del orden de tabulación. */}
                <div
                  id={idLista}
                  className={cn(
                    "grid transition-[grid-template-rows,visibility] duration-200 motion-reduce:transition-none",
                    abierto ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]",
                  )}
                >
                  <ul className="flex flex-col gap-1 overflow-hidden">
                    {grupo.hrefs.map((href) => {
                      const seccion = SECCIONES_PANEL.find((s) => s.href === href)!;
                      const actual = activa(href);
                      return (
                        <li key={href}>
                          <Link href={href} aria-current={actual ? "page" : undefined} className={clasesEnlace(actual)}>
                            {actual && indicador}
                            {seccion.etiqueta}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-blanco/10 p-4">
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
