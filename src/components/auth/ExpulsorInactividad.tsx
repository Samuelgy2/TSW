"use client";

import { useEffect } from "react";

const LIMITE_MS = 5 * 60 * 1000;
const LATIDO_MS = 60 * 1000;
const EVENTOS = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"] as const;

/**
 * Cierra la sesión tras 5 minutos sin interacción en esta pestaña.
 * `alExpirar` es la Server Action de cierre de sesión (cierra y redirige).
 *
 * Con `latido` (el panel), cada minuto con actividad avisa al servidor para
 * renovar la cookie de actividad (lib/auth/actividad.ts), que es la que de
 * verdad caduca la sesión en el servidor. Sin latido, leer una página larga
 * sin hacer peticiones la haría caducar aunque la persona esté ahí. Si el
 * servidor ya la cerró (la respuesta es una redirección al acceso), se sale
 * de inmediato.
 *
 * Este temporizador es la parte visible; la barrera real es el middleware.
 */
export function ExpulsorInactividad({
  alExpirar,
  latido,
}: {
  alExpirar: () => Promise<void>;
  latido?: string;
}) {
  useEffect(() => {
    let ultimo = Date.now();
    let cerrando = false;

    const expirar = () => {
      if (cerrando) return;
      cerrando = true;
      void alExpirar();
    };
    let id = setTimeout(expirar, LIMITE_MS);
    let huboActividad = false;

    const actividad = () => {
      const ahora = Date.now();
      if (ahora - ultimo < 1000) return; // pointermove dispara a ráfagas
      ultimo = ahora;
      huboActividad = true;
      clearTimeout(id);
      id = setTimeout(expirar, LIMITE_MS);
    };
    // Un portátil dormido o una pestaña dormida pueden retrasar el temporizador.
    const alVolver = () => {
      if (document.visibilityState === "visible" && Date.now() - ultimo >= LIMITE_MS) expirar();
    };

    const idLatido = latido
      ? setInterval(() => {
          if (!huboActividad) return;
          huboActividad = false;
          fetch(latido, { method: "POST", cache: "no-store" })
            .then((r) => {
              if (r.redirected) expirar();
            })
            .catch(() => {}); // sin red: el próximo latido lo reintenta
        }, LATIDO_MS)
      : undefined;

    for (const e of EVENTOS) window.addEventListener(e, actividad, { passive: true });
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearTimeout(id);
      clearInterval(idLatido);
      for (const e of EVENTOS) window.removeEventListener(e, actividad);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [alExpirar, latido]);

  return null;
}
