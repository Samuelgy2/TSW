/**
 * Envío real de un correo de prueba, por el mismo camino que la aplicación.
 *
 * Importa `src/lib/correo/transporte.ts` y `src/lib/correo/plantillas.ts`
 * tal cual: si esto llega al buzón, lo que corre en producción también. No
 * hay aquí ni un `createTransport` paralelo ni un HTML de mentira.
 *
 * Uso:
 *
 *   npm run correo:probar -- <destino@ejemplo.com> [plantilla]
 *
 * `plantilla` es `recuperacion` (por defecto) o `invitacion`.
 * El destino va SIEMPRE por argumento: ninguna dirección vive en este archivo.
 *
 * Los datos son de prueba y se notan: el enlace lleva un token que no existe, así que abrirlo falla a propósito. Esto comprueba
 * la entrega del correo, no el flujo de acceso.
 *
 * Por qué `--conditions=react-server`: los módulos de correo empiezan con
 * `import "server-only"`, cuyo punto de entrada por defecto lanza un error
 * ("This module cannot be imported from a Client Component module"). Con esa
 * condición, Node resuelve la entrada vacía del paquete y el import funciona
 * sin tocar el código de la aplicación. Va dentro del script de npm.
 */
import { cargarEnvLocal } from "./_comun";

import {
  correoInvitacion,
  correoRestablecerContrasena,
} from "../src/lib/correo/plantillas";
import { enviarCorreo, type Correo } from "../src/lib/correo/transporte";

type NombrePlantilla = "recuperacion" | "invitacion";

const PLANTILLAS: NombrePlantilla[] = ["recuperacion", "invitacion"];

/** Datos de prueba, evidentes a simple vista. Nada de tokens reales. */
const NOMBRE_DE_PRUEBA = "[Nombre de prueba]";

function enlaceDePrueba(): string {
  const sitio = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${sitio}/admin/auth/callback?siguiente=/admin/restablecer&token_hash=TOKEN-DE-PRUEBA-NO-VALIDO&type=recovery`;
}

/** `viviendofotoafoto@gmail.com` -> `viv…@gmail.com`. */
function enmascararCorreo(valor: string): string {
  const [local = "", dominio = ""] = valor.split("@");
  if (!dominio) return `${local.slice(0, 3)}…`;
  return `${local.slice(0, 3)}…@${dominio}`;
}

/** `TSW <tswbmxclub@gmail.com>` -> `TSW <tsw…@gmail.com>`. */
function enmascararRemitente(valor: string): string {
  const m = /^(.*)<([^>]+)>\s*$/.exec(valor);
  if (!m) return enmascararCorreo(valor.trim());
  return `${m[1]}<${enmascararCorreo(m[2] as string)}>`;
}

function armar(plantilla: NombrePlantilla, destino: string): Correo {
  switch (plantilla) {
    case "recuperacion":
      return correoRestablecerContrasena({
        para: destino,
        enlace: enlaceDePrueba(),
        nombre: NOMBRE_DE_PRUEBA,
      });
    case "invitacion":
      return correoInvitacion({
        para: destino,
        enlace: enlaceDePrueba(),
        nombre: NOMBRE_DE_PRUEBA,
        tipo: "admin",
      });
  }
}

function uso(motivo: string): never {
  console.error(`\n${motivo}\n`);
  console.error("Uso:  npm run correo:probar -- <destino@ejemplo.com> [plantilla]");
  console.error(`      plantilla: ${PLANTILLAS.join(" | ")}  (por defecto: recuperacion)\n`);
  process.exit(2);
}

async function principal(): Promise<void> {
  cargarEnvLocal();

  const [destino, plantillaArg = "recuperacion"] = process.argv.slice(2);

  if (!destino) uso("Falta la dirección de destino.");
  // Validación mínima: solo evitar un envío a algo que no es un correo.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destino)) uso(`«${destino}» no parece una dirección de correo.`);
  if (!PLANTILLAS.includes(plantillaArg as NombrePlantilla)) uso(`Plantilla desconocida: «${plantillaArg}».`);

  const plantilla = plantillaArg as NombrePlantilla;

  // Confirmación de qué variables tomó, antes de tocar la red. La clave NO se
  // imprime, ni enmascarada: no hace falta verla para saber si está puesta.
  const host = process.env.CORREO_SMTP_HOST ?? "(sin definir)";
  const puerto = process.env.CORREO_SMTP_PUERTO ?? "(sin definir)";
  const usuario = process.env.CORREO_SMTP_USUARIO;
  const remitente = process.env.CORREO_REMITENTE;

  console.log("");
  console.log("Configuración que tomó el transporte:");
  console.log(`  servidor   ${host}:${puerto}`);
  console.log(`  usuario    ${usuario ? enmascararCorreo(usuario) : "(sin definir)"}`);
  console.log(`  remitente  ${remitente ? enmascararRemitente(remitente) : "(sin definir)"}`);
  console.log(`  clave      ${process.env.CORREO_SMTP_CLAVE ? "definida" : "(sin definir)"}`);
  console.log("");

  const correo = armar(plantilla, destino);
  console.log(`Enviando la plantilla «${plantilla}» a ${enmascararCorreo(destino)}…`);
  console.log(`  asunto: ${correo.asunto}`);
  console.log("");

  try {
    await enviarCorreo(correo);
  } catch (error) {
    // enviarCorreo traduce el fallo a ErrorServicioExterno y registra solo el
    // mensaje, pero adjunta el error del servidor SMTP en `cause`. Ese es el
    // que sirve: trae código, comando y respuesta literal de Gmail.
    console.error("EL ENVÍO FALLÓ.");
    const causa = error instanceof Error ? error.cause : undefined;
    if (causa) {
      console.error("Error del servidor de correo:");
      console.error(causa);
    } else {
      console.error(error);
    }

    // Una segunda pasada que solo abre la conexión y autentica, sin mandar
    // nada: separa «no puedo entrar al buzón» de «entro pero el envío se
    // rechaza», que en Gmail son dos arreglos distintos.
    console.error("");
    console.error("Comprobando aparte la conexión y las credenciales…");
    const { createTransport } = await import("nodemailer");
    try {
      await createTransport({
        host: process.env.CORREO_SMTP_HOST,
        port: Number(process.env.CORREO_SMTP_PUERTO),
        secure: Number(process.env.CORREO_SMTP_PUERTO) === 465,
        auth: {
          user: process.env.CORREO_SMTP_USUARIO as string,
          pass: process.env.CORREO_SMTP_CLAVE as string,
        },
      }).verify();
      console.error("  El servidor acepta la conexión y las credenciales:");
      console.error("  el fallo está en el envío, no en el acceso al buzón.");
    } catch (errorConexion) {
      console.error("  Tampoco pasa la conexión o la autenticación:");
      console.error(errorConexion);
    }
    console.log("");
    process.exit(1);
  }

  console.log("Enviado. Revisa la bandeja (y la carpeta de spam la primera vez).");
  console.log("");
}

// Sin `await` de primer nivel: tsx carga este archivo como CommonJS y un
// módulo asíncrono revienta con ERR_REQUIRE_ASYNC_MODULE antes de ejecutar
// nada.
principal().catch((error) => {
  console.error(error);
  process.exit(1);
});
