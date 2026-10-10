// Prueba contra el remoto (después de aplicar 20261010120000) de que RLS de
// administración exige aal2. Usuario temporal propio (example.com), con perfil
// admin activo creado por service role; se borra al terminar. No toca cuentas reales.
//
//   aal1 (solo contraseña): es_admin() sigue true (la puerta del login lo
//        necesita), pero evento_auditoria devuelve 0 filas y una escritura a
//        deporte es rechazada.
//   aal2 (tras el código TOTP): evento_auditoria devuelve filas.
import { createClient } from "@supabase/supabase-js";
import { createHmac, randomBytes } from "node:crypto";
import assert from "node:assert/strict";

process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const servicio = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const nuevo = () => createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

function base32(s) {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of s.replace(/=+$/, "")) bits += A.indexOf(c).toString(2).padStart(5, "0");
  const b = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) b.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(b);
}
function totp(secreto) {
  const t = Buffer.alloc(8);
  t.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = createHmac("sha1", base32(secreto)).update(t).digest();
  const o = h[19] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, "0");
}

const correo = `verificacion-aal2-${Date.now()}@example.com`;
const clave = randomBytes(12).toString("hex") + "Aa1!";
const { data: creado, error: e0 } = await servicio.auth.admin.createUser({ email: correo, password: clave, email_confirm: true });
assert.ifError(e0);
const id = creado.user.id;

try {
  const { error: ep } = await servicio.from("perfil_admin").insert({ id, nombre: "Verificación aal2", activo: true });
  assert.ifError(ep);

  const c = nuevo();
  const { error: es } = await c.auth.signInWithPassword({ email: correo, password: clave });
  assert.ifError(es);

  // Con la sesión en aal1 y SIN factor inscrito: lo que necesita el flujo de activar MFA.
  assert.equal((await c.rpc("es_admin")).data, true, "aal1: es_admin() debe seguir true (puerta del login)");
  const propia = await c.from("perfil_admin").select("id").eq("id", id);
  assert.equal(propia.data?.length, 1, "aal1: debe leer su propia fila de perfil_admin");
  const { data: en, error: ee } = await c.auth.mfa.enroll({ factorType: "totp", friendlyName: "TSW " + Date.now(), issuer: "TSW" });
  assert.ifError(ee); // inscribir factor = API de Auth, sin RLS

  const aal1 = await c.from("evento_auditoria").select("id").limit(1);
  assert.ok(aal1.error || aal1.data.length === 0, "aal1: evento_auditoria debe dar 0 filas o error");
  const escritura = await c.from("deporte").update({ activo: true }).eq("id", "00000000-0000-0000-0000-000000000000").select();
  assert.ok(escritura.error || escritura.data.length === 0, "aal1: escritura a deporte no debe tocar filas");
  console.log("aal1 OK: es_admin true, 0 filas en bitácora, escritura sin efecto");

  const { error: ev } = await c.auth.mfa.challengeAndVerify({ factorId: en.id, code: totp(en.totp.secret) });
  assert.ifError(ev);
  const aal2 = await c.from("evento_auditoria").select("id").limit(1);
  assert.ifError(aal2.error);
  assert.ok(aal2.data.length > 0, "aal2: evento_auditoria debe devolver filas (¿bitácora vacía?)");
  console.log("aal2 OK: la bitácora responde con filas");
  console.log("VERIFICACIÓN AAL2 LIMPIA");
} finally {
  await servicio.auth.admin.deleteUser(id);
  const { data: resto } = await servicio.from("perfil_admin").select("id").eq("id", id);
  const { data: u } = await servicio.auth.admin.getUserById(id);
  console.log("temporal borrado:", !u?.user && resto?.length === 0 ? "sí" : "NO — revisar " + id);

  // Barrido final: ningún verificacion-aal2-… (de esta corrida o de una anterior
  // que murió a medias) en auth.users ni en perfil_admin.
  const { data: lista, error: el } = await servicio.auth.admin.listUsers({ perPage: 1000 });
  const sobrantes = (lista?.users ?? []).filter((x) => x.email?.startsWith("verificacion-aal2-"));
  const { data: perfiles } = await servicio.from("perfil_admin").select("id").in("id", sobrantes.map((x) => x.id));
  if (el || sobrantes.length > 0 || (perfiles?.length ?? 0) > 0) {
    console.error("\n!!!!!!!! QUEDAN USUARIOS DE PRUEBA verificacion-aal2-… !!!!!!!!");
    console.error(el ? "No se pudo listar: " + el.message : sobrantes.map((x) => `${x.id} ${x.email}`).join("\n"));
    process.exitCode = 1;
  } else {
    console.log("barrido final: 0 usuarios verificacion-aal2-… en auth.users ni perfil_admin");
  }
}
