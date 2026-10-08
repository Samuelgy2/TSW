"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { destinoSeguro, obtenerPerfil } from "@/lib/auth";
import { ipDelCliente } from "@/lib/auth/ip";
import {
  MAX_INTENTOS_POR_IP,
  bloqueoAcceso,
  registrarAcierto,
  registrarFallo,
} from "@/lib/auth/limite";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { ResultadoAccion } from "./acciones";

/**
 * Segundo factor (TOTP) de los administradores. Todo corre en el servidor con
 * la sesión de las cookies: nada del MFA toca el cliente de navegador.
 *
 * Comprobado contra el proyecto real (2026-10-01, usuario temporal borrado):
 * tras la contraseña la sesión queda en aal1; `challengeAndVerify` la sube a
 * aal2; un login nuevo vuelve a aal1/aal2-pendiente; y Supabase rechaza activar
 * un segundo factor desde aal1 si ya hay uno verificado ("AAL2 required to
 * enroll a new factor"), así que con solo la contraseña nadie puede añadir el
 * suyo.
 */

const CODIGO = z.string().regex(/^\d{6}$/, "El código tiene 6 dígitos.");
const CODIGO_INCORRECTO = "Código incorrecto. Revisa la hora de tu teléfono y vuelve a intentar.";

export type ActivacionMfa =
  | { ok: true; factorId: string; qr: string; secreto: string }
  | { ok: false; error: string };

/** Solo un administrador ACTIVO, aunque todavía no haya pasado el segundo factor. */
async function adminActivo() {
  const sesion = await obtenerPerfil();
  return sesion?.tipo === "admin" && sesion.perfil.activo ? sesion : null;
}

/**
 * Intentos de código: por IP + cuenta (5 → 5 min) y por IP sola, igual que el
 * acceso. Con la cuenta sola, quien conociera la contraseña podría bloquear al
 * administrador a propósito.
 */
async function claves(usuarioId: string) {
  const ip = await ipDelCliente();
  return { porCuenta: `mfa|${ip}|${usuarioId}`, porIp: `ip|${ip}` };
}

/**
 * Paso 1 de la activación: crea el factor (sin verificar) y devuelve el QR y la
 * clave de texto. Se llama al pulsar el botón, no al cargar la página: así un
 * prefetch o un doble render no dejan factores a medio crear. Los factores sin
 * verificar de intentos anteriores se borran antes.
 */
export async function iniciarActivacionMfa(): Promise<ActivacionMfa> {
  const sesion = await adminActivo();
  if (!sesion) return { ok: false, error: "Debes iniciar sesión para continuar." };

  const supabase = await crearClienteServidor();
  const { data: factores, error: errorLista } = await supabase.auth.mfa.listFactors();
  if (errorLista || !factores) return { ok: false, error: "No se pudo preparar la activación. Inténtalo de nuevo." };
  if (factores.totp.length > 0) return { ok: false, error: "Ya tienes un segundo factor activo." };

  for (const f of factores.all) {
    if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `TSW ${Date.now()}`,
    issuer: "TSW",
  });
  if (error || !data) {
    console.error("[mfa] enroll", error?.message);
    return { ok: false, error: "No se pudo preparar la activación. Inténtalo de nuevo." };
  }
  // Supabase manda el SVG como `data:image/svg+xml;utf-8,<svg…>` con salto de línea
  // al final y sin codificar: next/image rechaza el src con espacio final. Se
  // reempaqueta codificado.
  const svg = data.totp.qr_code.replace("data:image/svg+xml;utf-8,", "").trim();
  const qr = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  return { ok: true, factorId: data.id, qr, secreto: data.totp.secret };
}

/** Paso 2 de la activación: el primer código confirma el factor y sube la sesión a aal2. */
export async function confirmarActivacionMfa(entrada: {
  factorId: string;
  codigo: string;
}): Promise<ResultadoAccion> {
  const sesion = await adminActivo();
  if (!sesion) return { ok: false, error: "Debes iniciar sesión para continuar." };

  const factorId = z.string().uuid().safeParse(entrada.factorId);
  const codigo = CODIGO.safeParse(entrada.codigo);
  if (!factorId.success || !codigo.success) {
    return { ok: false, error: codigo.success ? "Factor inválido." : codigo.error.issues[0]!.message };
  }

  const { porCuenta, porIp } = await claves(sesion.usuario.id);
  const bloqueado = bloqueoAcceso(porCuenta, porIp);
  if (bloqueado) return bloqueado;

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factorId.data, code: codigo.data });
  if (error) {
    registrarFallo(porCuenta);
    registrarFallo(porIp, MAX_INTENTOS_POR_IP);
    return bloqueoAcceso(porCuenta, porIp) ?? { ok: false, error: CODIGO_INCORRECTO };
  }

  registrarAcierto(porCuenta);
  redirect("/admin");
}

/** Pide el código de la app y sube la sesión a aal2. */
export async function verificarMfa(entrada: { codigo: string; redirigir?: string }): Promise<ResultadoAccion> {
  const sesion = await adminActivo();
  if (!sesion) return { ok: false, error: "Debes iniciar sesión para continuar." };

  const codigo = CODIGO.safeParse(entrada.codigo);
  if (!codigo.success) return { ok: false, error: codigo.error.issues[0]!.message };

  const { porCuenta, porIp } = await claves(sesion.usuario.id);
  const bloqueado = bloqueoAcceso(porCuenta, porIp);
  if (bloqueado) return bloqueado;

  const supabase = await crearClienteServidor();
  const { data: factores } = await supabase.auth.mfa.listFactors();
  const factor = factores?.totp[0];
  if (!factor) return { ok: false, error: "No tienes un segundo factor activo." };

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: codigo.data });
  if (error) {
    registrarFallo(porCuenta);
    registrarFallo(porIp, MAX_INTENTOS_POR_IP);
    return bloqueoAcceso(porCuenta, porIp) ?? { ok: false, error: CODIGO_INCORRECTO };
  }

  registrarAcierto(porCuenta);
  redirect(destinoSeguro(entrada.redirigir));
}
