// La cookie de sesión no debe sobrevivir al navegador, y la de borrado sí debe conservar su maxAge: 0.
import assert from "node:assert/strict";

import { comoCookieDeSesion } from "../src/lib/supabase/cookies-sesion";

const viva = comoCookieDeSesion({ path: "/", maxAge: 34560000, expires: new Date(), sameSite: "lax" as const }, "token");
assert.equal("maxAge" in viva, false, "la cookie de sesión no debe llevar maxAge");
assert.equal("expires" in viva, false, "la cookie de sesión no debe llevar expires");
assert.equal(viva.path, "/");
assert.equal(viva.sameSite, "lax");

assert.equal(comoCookieDeSesion({ path: "/", maxAge: 0 }, "x").maxAge, 0, "el borrado conserva maxAge: 0");
assert.equal(comoCookieDeSesion({ path: "/", maxAge: 400 }, "").maxAge, 400, "valor vacío = borrado: no se toca");

console.log("COOKIES DE SESIÓN LIMPIO: 5 comprobaciones");
