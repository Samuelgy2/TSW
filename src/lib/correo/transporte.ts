import "server-only";

import nodemailer, { type Transporter } from "nodemailer";
import { z } from "zod";

import { ErrorServicioExterno } from "@/lib/errors";

/**
 * Envío de correo transaccional de la aplicación.
 *
 * Los correos de acceso (restablecer contraseña, invitaciones) los manda la
 * aplicación, no Supabase: Supabase solo genera el enlace. Así el texto es
 * nuestro, en español, y no dependemos de las plantillas del panel de
 * Supabase (que exigen SMTP propio para editarse) ni de su límite de dos
 * correos por hora.
 *
 * Nodemailer es agnóstico del proveedor: hoy las variables apuntan a un
 * buzón de Gmail con contraseña de aplicación; cuando exista dominio propio
 * apuntarán a Resend (`smtp.resend.com`, usuario `resend`, clave = API key)
 * sin tocar este archivo.
 *
 * Único punto de la aplicación que importa nodemailer.
 */

const esquema = z.object({
  CORREO_SMTP_HOST: z.string().min(1),
  CORREO_SMTP_PUERTO: z.coerce.number().int().positive(),
  CORREO_SMTP_USUARIO: z.string().min(1),
  CORREO_SMTP_CLAVE: z.string().min(1),
  /** Remitente, p. ej. `TSW <notificaciones@corporaciontws.com>`. */
  CORREO_REMITENTE: z.string().min(3),
  /** A dónde llegan las respuestas. Opcional: sin ella, responden al remitente. */
  CORREO_REPLY_TO: z.string().min(3).optional(),
});

type Configuracion = z.infer<typeof esquema>;

let configuracion: Configuracion | null = null;
let transporte: Transporter | null = null;

/** Falla con un mensaje claro si falta configuración, en vez de fingir que envió. */
function leerConfiguracion(): Configuracion {
  if (configuracion) return configuracion;
  const resultado = esquema.safeParse({
    CORREO_SMTP_HOST: process.env.CORREO_SMTP_HOST,
    CORREO_SMTP_PUERTO: process.env.CORREO_SMTP_PUERTO,
    CORREO_SMTP_USUARIO: process.env.CORREO_SMTP_USUARIO,
    CORREO_SMTP_CLAVE: process.env.CORREO_SMTP_CLAVE,
    CORREO_REMITENTE: process.env.CORREO_REMITENTE,
    CORREO_REPLY_TO: process.env.CORREO_REPLY_TO || undefined,
  });
  if (!resultado.success) {
    const faltan = resultado.error.issues.map((i) => String(i.path[0])).join(", ");
    throw new Error(`Falta configurar el correo saliente: ${faltan}. Revisa .env.local o las variables de Vercel.`);
  }
  configuracion = resultado.data;
  return configuracion;
}

function obtenerTransporte(): Transporter {
  if (transporte) return transporte;
  const c = leerConfiguracion();
  transporte = nodemailer.createTransport({
    host: c.CORREO_SMTP_HOST,
    port: c.CORREO_SMTP_PUERTO,
    // 465 es SMTPS (TLS desde el inicio); 587 negocia STARTTLS. Ambos cifran.
    secure: c.CORREO_SMTP_PUERTO === 465,
    auth: { user: c.CORREO_SMTP_USUARIO, pass: c.CORREO_SMTP_CLAVE },
  });
  return transporte;
}

/** nodemailer no tipa estos campos; vienen del servidor SMTP cuando existen. */
function extraerDetalleSmtp(error: Error): Record<string, unknown> {
  const { code, command, response, responseCode } = error as Error & Record<string, unknown>;
  return { code, command, response, responseCode };
}

export type Correo = {
  para: string;
  asunto: string;
  html: string;
  /** Versión sin formato, para clientes que no muestran HTML. */
  texto: string;
};

/**
 * Envía un correo. Lanza ErrorServicioExterno si el servidor de correo lo
 * rechaza; quien llama decide si eso se muestra o se silencia (en "olvidé mi
 * contraseña" se silencia: la respuesta es la misma exista o no el correo).
 */
export async function enviarCorreo(correo: Correo): Promise<void> {
  const c = leerConfiguracion();
  try {
    await obtenerTransporte().sendMail({
      from: c.CORREO_REMITENTE,
      replyTo: c.CORREO_REPLY_TO,
      to: correo.para,
      subject: correo.asunto,
      html: correo.html,
      text: correo.texto,
    });
  } catch (error) {
    // Prefijo distintivo para buscarlo en Runtime Logs de Vercel sin tener que
    // correr scripts/probar-correo.ts aparte. Incluye code/command/response de
    // nodemailer si vienen: son del servidor SMTP, nunca el destinatario ni el
    // cuerpo del correo.
    const detalle =
      error instanceof Error
        ? { mensaje: error.message, ...extraerDetalleSmtp(error) }
        : { mensaje: String(error) };
    console.error("[correo-fallo]", detalle);
    const fallo = new ErrorServicioExterno(
      "correo",
      "No se pudo enviar el correo. Inténtalo de nuevo en unos minutos.",
    );
    // El error original viaja en `cause`, no al log: los de un servidor SMTP
    // traen código, comando y respuesta, y eso es justo lo que hace falta para
    // diagnosticar (scripts/probar-correo.ts lo imprime). Adjuntarlo no lo
    // registra en ninguna parte.
    fallo.cause = error;
    throw fallo;
  }
}
