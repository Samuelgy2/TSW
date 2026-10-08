// Genera los iconos y la imagen social desde el logo. Se corre a mano cuando
// cambie el logo: node scripts/generar-iconos.mjs
//
// Salen a src/app/ con los nombres que Next.js reconoce por convención
// (icon, apple-icon, favicon.ico, opengraph-image): él arma las
// etiquetas <link> y <meta>. Todo con fondo sólido: sin transparencia, un
// favicon se ve negro en algunos temas y Google lo descarta.
import fs from "node:fs";
import sharp from "sharp";

const LOGO = "public/imagenes/logocorporacion.png"; // cuadrado, círculo sobre blanco
const AZUL_PROFUNDO = "#0B1B33";

const cuadrado = (lado) => sharp(LOGO).resize(lado, lado).flatten({ background: "#ffffff" });

await cuadrado(512).png().toFile("src/app/icon.png");
await cuadrado(180).png().toFile("src/app/apple-icon.png");

// .ico con un solo PNG de 48 px dentro (formato válido desde Vista). Google pide
// un múltiplo de 48 y los navegadores piden /favicon.ico sin leer el HTML.
const png48 = await cuadrado(48).png().toBuffer();
const cabecera = Buffer.alloc(22);
cabecera.writeUInt16LE(1, 2); // tipo: icono
cabecera.writeUInt16LE(1, 4); // una imagen
cabecera.writeUInt8(48, 6); // ancho
cabecera.writeUInt8(48, 7); // alto
cabecera.writeUInt16LE(1, 10); // planos
cabecera.writeUInt16LE(32, 12); // bits por píxel
cabecera.writeUInt32LE(png48.length, 14);
cabecera.writeUInt32LE(22, 18); // desplazamiento de los datos
fs.writeFileSync("src/app/favicon.ico", Buffer.concat([cabecera, png48]));

// Imagen social 1200x630: el logo recortado en círculo sobre azul profundo.
const D = 520;
const circulo = Buffer.from(`<svg width="${D}" height="${D}"><circle cx="${D / 2}" cy="${D / 2}" r="${D / 2}"/></svg>`);
const logoRedondo = await sharp(LOGO).resize(D, D).composite([{ input: circulo, blend: "dest-in" }]).png().toBuffer();
const social = sharp({ create: { width: 1200, height: 630, channels: 3, background: AZUL_PROFUNDO } })
  .composite([{ input: logoRedondo, left: 340, top: 55 }])
  .flatten({ background: AZUL_PROFUNDO })
  .removeAlpha()
  .png();
await social.toFile("src/app/opengraph-image.png");
