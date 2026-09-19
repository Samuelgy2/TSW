import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: { default: "Acceso al panel", template: "%s | Panel TSW" },
  robots: { index: false, follow: false },
};

/** Páginas de acceso: una tarjeta centrada, sin header ni footer públicos. */
export default function LayoutAcceso({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-gris-frio px-4 py-10">
      <Link
        href="/"
        className="mb-6 font-display text-3xl tracking-tight text-azul-profundo focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-rojo"
      >
        TSW
        <span className="ml-2 text-xs font-normal uppercase tracking-[0.2em] text-texto-sec">Panel</span>
      </Link>
      <div className="w-full max-w-md rounded-lg border border-gris-borde bg-blanco p-6 sm:p-8">{children}</div>
    </main>
  );
}
