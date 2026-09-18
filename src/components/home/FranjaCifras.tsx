"use client";

import { useEffect, useRef, useState } from "react";

import { CIFRAS, type Cifra } from "@/config/sitio";
import { useMovimientoReducido } from "@/lib/animaciones";

/**
 * Franja roja de cifras clave. El rojo se usa aquí como fondo de una banda
 * corta, no como fondo dominante de la página, y el texto va en blanco.
 *
 * Las cifras que todavía no existen se muestran como pendientes: no se inventa
 * un número para que la animación quede bonita.
 */
export function FranjaCifras() {
  return (
    <section aria-label="Cifras del club" className="bg-rojo text-blanco">
      <div className="contenedor grid grid-cols-2 gap-x-6 gap-y-8 py-10 lg:grid-cols-4 lg:py-12">
        {CIFRAS.map((cifra) => (
          <div key={cifra.etiqueta} className="text-center">
            <ValorCifra cifra={cifra} />
            <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-blanco/85">
              {cifra.etiqueta}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ValorCifra({ cifra }: { cifra: Cifra }) {
  if (cifra.valor === null) {
    return (
      <p className="font-display text-2xl leading-none sm:text-3xl" title="Dato pendiente de confirmar">
        [dato]
      </p>
    );
  }

  return (
    <p className="font-display text-4xl leading-none sm:text-5xl lg:text-6xl">
      <CuentaAscendente hasta={cifra.valor} />
      {cifra.sufijo}
    </p>
  );
}

const DURACION_MS = 1200;

/**
 * Cuenta ascendente al entrar en el viewport, una sola vez.
 *
 * `valor` arranca en null, que significa "todavía sin animar": se pinta el
 * número final. Así el HTML del servidor y el primer render del cliente
 * coinciden, y quien no llegue a ver la animación igual lee la cifra.
 *
 * Solo se anima si al montar la franja está por debajo de la pantalla. Si ya
 * está a la vista, se queda con el número final: bajarlo a cero para contar
 * hacia arriba sería un salto delante de los ojos del lector.
 */
function CuentaAscendente({ hasta }: { hasta: number }) {
  const reducido = useMovimientoReducido();
  const [valor, setValor] = useState<number | null>(null);
  const ancla = useRef<HTMLSpanElement>(null);
  const yaCorrio = useRef(false);

  useEffect(() => {
    if (reducido) return;

    const elemento = ancla.current;
    if (!elemento || yaCorrio.current) return;

    const caja = elemento.getBoundingClientRect();
    if (caja.top <= window.innerHeight * 0.9) return;

    setValor(0);

    const observador = new IntersectionObserver(
      (entradas) => {
        const visible = entradas[0]?.isIntersecting;
        if (!visible || yaCorrio.current) return;
        yaCorrio.current = true;
        observador.disconnect();

        const inicio = performance.now();
        const paso = (ahora: number) => {
          const avance = Math.min((ahora - inicio) / DURACION_MS, 1);
          // Desaceleración: rápido al principio, se asienta al final.
          const suavizado = 1 - Math.pow(1 - avance, 3);
          setValor(Math.round(hasta * suavizado));
          if (avance < 1) requestAnimationFrame(paso);
        };
        requestAnimationFrame(paso);
      },
      { threshold: 0.4 },
    );

    observador.observe(elemento);
    return () => observador.disconnect();
  }, [hasta, reducido]);

  return (
    <span ref={ancla}>
      {/* El número final siempre está en el DOM accesible, aunque la
          animación no haya terminado o no se ejecute nunca. */}
      <span aria-hidden="true">{(valor ?? hasta).toLocaleString("es-CO")}</span>
      <span className="sr-only">{hasta.toLocaleString("es-CO")}</span>
    </span>
  );
}
