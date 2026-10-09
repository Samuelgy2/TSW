import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { crearClienteServidor } from "@/lib/supabase/server";
import { ErrorNoAutorizado } from "@/lib/errors";
import {
  RUTA_ACCESO_USUARIO,
  RUTA_ACTIVAR_MFA,
  RUTA_LOGIN,
  RUTA_PANEL,
  RUTA_VERIFICAR_MFA,
  esRutaAdminPublica,
  esRutaCuentaPublica,
} from "./rutas";

/**
 * Dos poblaciones de cuentas, dos perfiles en la base: perfil_admin (panel) y
 * perfil_usuario (área de cuenta). Una sesión de usuario NO es sesión de
 * administrador: las políticas `*_admin` exigen perfil_admin activo (migración
 * 13), y aquí se replica la misma comprobación en cada página y cada acción —
 * la seguridad no se delega al middleware ni a una sola capa.
 */
export type TipoPerfil = "admin" | "usuario";

export type PerfilSesion = {
  id: string;
  nombre: string;
  activo: boolean;
  telefono?: string | null;
};

export type Sesion = {
  tipo: TipoPerfil;
  usuario: User;
  perfil: PerfilSesion;
};

export type SesionAdmin = Sesion & { tipo: "admin" };
export type SesionUsuario = Sesion & { tipo: "usuario" };

/** Guardias de tipo: los discrminantes no se estrechan solos al volver de un `if`. */
function esSesionAdmin(sesion: Sesion): sesion is SesionAdmin {
  return sesion.tipo === "admin";
}

function esSesionUsuario(sesion: Sesion): sesion is SesionUsuario {
  return sesion.tipo === "usuario";
}

/** Usuario verificado contra el servidor de Auth, o null si no hay sesión. */
export async function obtenerUsuario(): Promise<User | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

/**
 * Sesión completa: el usuario de Auth y SU perfil, con el tipo que lo decide.
 *
 * Dos asimetrías que vienen del RLS (migración 13), no de esta función:
 *  - Un administrador ACTIVO lee su fila de perfil_admin. Uno inactivo no lee
 *    NINGUNA fila de perfil_admin —ni la propia—, así que aquí llega como
 *    null. Para la puerta del panel la verdad la da la RPC es_admin(), que
 *    corre security definer (ver iniciarSesion).
 *  - Un usuario siempre lee su propia fila de perfil_usuario, activo o no:
 *    la política perfil_usuario_lectura lo permite por id.
 */
export async function obtenerPerfil(): Promise<Sesion | null> {
  const usuario = await obtenerUsuario();
  if (!usuario) return null;

  const supabase = await crearClienteServidor();

  const { data: admin } = await supabase
    .from("perfil_admin")
    .select("id, nombre, activo")
    .eq("id", usuario.id)
    .maybeSingle();
  if (admin) return { tipo: "admin", usuario, perfil: admin };

  const { data: usuarioPerfil } = await supabase
    .from("perfil_usuario")
    .select("id, nombre, telefono, activo")
    .eq("id", usuario.id)
    .maybeSingle();
  if (usuarioPerfil) return { tipo: "usuario", usuario, perfil: usuarioPerfil };

  return null;
}

/**
 * Segundo factor (TOTP) de los administradores, obligatorio:
 *  · "ok"        sesión en nivel aal2 (o MFA apagado, ver abajo).
 *  · "verificar" tiene factor activado pero esta sesión solo pasó la contraseña:
 *                falta el código de la app.
 *  · "activar"   todavía no tiene factor: debe activarlo antes de usar el panel.
 *
 * Se lee DESPUÉS de `obtenerUsuario` (getUser valida el token contra Auth; aquí
 * se vuelve a validar al pasar el JWT, ver abajo), y
 * ante cualquier error responde "verificar": nunca abre por fallo.
 *
 * `ADMIN_MFA_OBLIGATORIO=false` lo apaga: red de seguridad por si un
 * administrador queda fuera y hay que entrar a repararlo. Cualquier otro valor,
 * o ausente, lo deja obligatorio.
 */
export type EstadoMfa = "ok" | "verificar" | "activar";

export async function estadoMfa(): Promise<EstadoMfa> {
  if (process.env.ADMIN_MFA_OBLIGATORIO === "false") return "ok";
  const supabase = await crearClienteServidor();
  // Con el JWT explícito la librería valida el usuario contra Auth (getUser)
  // en vez de leer `session.user` de la cookie, que es lo que dispara el aviso
  // "getSession() could be insecure". Solo se lee `access_token` de la sesión.
  const { data: sesion } = await supabase.auth.getSession();
  const jwt = sesion.session?.access_token;
  if (!jwt) return "verificar";
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel(jwt);
  if (error || !data) return "verificar";
  if (data.currentLevel === "aal2") return "ok";
  return data.nextLevel === "aal2" ? "verificar" : "activar";
}

/**
 * Para Server Actions del panel: exige perfil de administrador ACTIVO. Una
 * sesión de usuario, o una sesión sin perfil, lanza ErrorNoAutorizado.
 */
export async function exigirAdmin(): Promise<SesionAdmin> {
  const sesion = await obtenerPerfil();
  if (!sesion || !esSesionAdmin(sesion) || !sesion.perfil.activo) {
    throw new ErrorNoAutorizado();
  }
  if ((await estadoMfa()) !== "ok") throw new ErrorNoAutorizado("Falta verificar el segundo factor.");
  return sesion;
}

/** Igual que exigirAdmin, para el área de usuario. */
export async function exigirUsuario(): Promise<SesionUsuario> {
  const sesion = await obtenerPerfil();
  if (!sesion || !esSesionUsuario(sesion) || !sesion.perfil.activo) {
    throw new ErrorNoAutorizado();
  }
  return sesion;
}

/**
 * Para páginas del panel: sin sesión redirige al acceso guardando el destino;
 * con sesión de USUARIO redirige a /cuenta — su puerta es otra. Se llama en
 * cada página, no solo en el layout: Next no vuelve a ejecutar el layout al
 * navegar entre páginas hermanas.
 */
export async function exigirAdminPagina(destino: string): Promise<SesionAdmin> {
  const sesion = await sesionAdminPagina(destino);
  const mfa = await estadoMfa();
  if (mfa === "verificar") redirect(`${RUTA_VERIFICAR_MFA}?redirigir=${encodeURIComponent(destino)}`);
  if (mfa === "activar") redirect(RUTA_ACTIVAR_MFA);
  return sesion;
}

/**
 * Para las dos páginas del propio segundo factor (verificar y activar), que no
 * pueden exigir el segundo factor sin crear un bucle. Exige administrador
 * activo y devuelve en qué punto del MFA está.
 */
export async function exigirAdminParaMfa(destino: string): Promise<{ sesion: SesionAdmin; mfa: EstadoMfa }> {
  const sesion = await sesionAdminPagina(destino);
  return { sesion, mfa: await estadoMfa() };
}

async function sesionAdminPagina(destino: string): Promise<SesionAdmin> {
  const sesion = await obtenerPerfil();
  if (!sesion) redirect(`${RUTA_LOGIN}?redirigir=${encodeURIComponent(destino)}`);
  if (!esSesionAdmin(sesion)) redirect(RUTA_ACCESO_USUARIO);

  // Inalcanzable por RLS (un admin inactivo ni siquiera lee su fila), pero la
  // comprobación queda como defensa en profundidad y da el destino correcto
  // si un día cambia la política.
  if (!sesion.perfil.activo) redirect(`${RUTA_LOGIN}?inactivo=1`);
  return sesion;
}

/**
 * Para páginas del área de cuenta: simétrica a exigirAdminPagina. Una sesión
 * de administrador que llega a /cuenta se redirige al panel.
 */
export async function exigirUsuarioPagina(destino: string): Promise<SesionUsuario> {
  const sesion = await obtenerPerfil();
  if (!sesion) redirect(`${RUTA_ACCESO_USUARIO}?redirigir=${encodeURIComponent(destino)}`);
  if (!esSesionUsuario(sesion)) redirect(RUTA_PANEL);

  if (!sesion.perfil.activo) {
    // Cuenta creada pero sin activar: la puerta con el aviso correspondiente.
    redirect(
      `${RUTA_ACCESO_USUARIO}?inactivo=1&redirigir=${encodeURIComponent(destino)}`,
    );
  }
  return sesion;
}

/**
 * Destino seguro tras el acceso: solo rutas relativas dentro de su área. Un
 * `redirigir` con dominio externo o con `//` sería una redirección abierta.
 * El tipo decide el área: un usuario jamás termina en /admin por un
 * `redirigir` manipulado, ni un administrador en /cuenta.
 */
export function destinoSeguro(
  redirigir: string | null | undefined,
  tipo: TipoPerfil = "admin",
): string {
  const raiz = tipo === "usuario" ? "/cuenta" : RUTA_PANEL;
  const prefijo = tipo === "usuario" ? "/cuenta" : "/admin";
  const esPublica = tipo === "usuario" ? esRutaCuentaPublica : esRutaAdminPublica;

  if (!redirigir) return raiz;
  if (!redirigir.startsWith(prefijo) || redirigir.startsWith("//")) return raiz;
  if (esPublica(redirigir)) return raiz;
  return redirigir;
}
