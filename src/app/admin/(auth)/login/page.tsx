import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RUTA_CUENTA, RUTA_PANEL, obtenerPerfil } from "@/lib/auth";
import { AccesoAdmin } from "@/features/admin/components/AccesoAdmin";

export const metadata: Metadata = { title: "Acceso" };

/**
 * Acceso al panel. Con una sesión ya abierta no hay nada que hacer aquí: al
 * panel si es de administrador, a /cuenta si es de usuario. Una sesión sin
 * perfil (cuenta sin activar) se queda: la puerta es donde ve el aviso, y al
 * intentar entrar recibirá "Credenciales incorrectas." en vez de una pista
 * sobre el estado de su cuenta.
 */
export default async function PaginaAcceso({
  searchParams,
}: {
  searchParams: Promise<{ redirigir?: string; sesion?: string }>;
}) {
  const { redirigir, sesion: estadoSesion } = await searchParams;
  const sesion = await obtenerPerfil();
  if (sesion) redirect(sesion.tipo === "usuario" ? RUTA_CUENTA : RUTA_PANEL);

  return <AccesoAdmin redirigir={redirigir} expirada={estadoSesion === "expirada"} />;
}
