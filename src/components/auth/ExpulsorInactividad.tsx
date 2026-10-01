"use client";

import { useEffect } from "react";

const LIMITE_MS = 5 * 60 * 1000;
const EVENTOS = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"] as const;

/**
 * Cierra la sesión tras 5 minutos sin interacción en esta pestaña.
 * `alExpirar` es la Server Action de cierre de sesión (cierra y redirige).
 *
 * ponytail: el control es del navegador, por pestaña; no invalida la cookie por
 * sí solo si alguien lo apaga. Con expiración de sesión en el servidor
 * (Supabase: inactivity timeout, plan Pro) la barrera sería real.
 */
export function ExpulsorInactividad({ alExpirar }: { alExpirar: () => Promise<void> }) {
  useEffect(() => {
    let ultimo = Date.now();
    let cerrando = false;

    const expirar = () => {
      if (cerrando) return;
      cerrando = true;
      void alExpirar();
    };
    let id = setTimeout(expirar, LIMITE_MS);

    const actividad = () => {
      const ahora = Date.now();
      if (ahora - ultimo < 1000) return; // pointermove dispara a ráfagas
      ultimo = ahora;
      clearTimeout(id);
      id = setTimeout(expirar, LIMITE_MS);
    };
    // Un portátil dormido o una pestaña dormida pueden retrasar el temporizador.
    const alVolver = () => {
      if (document.visibilityState === "visible" && Date.now() - ultimo >= LIMITE_MS) expirar();
    };

    for (const e of EVENTOS) window.addEventListener(e, actividad, { passive: true });
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearTimeout(id);
      for (const e of EVENTOS) window.removeEventListener(e, actividad);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [alExpirar]);

  return null;
}
