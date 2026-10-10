/**
 * Comprobación de las reglas de selección de club de `/semilleros[/<slug>]`.
 *
 * Son cuatro casos y ninguno se puede provocar contra el remoto sin desactivar
 * clubes de verdad, así que van aquí, sobre la función real —no una copia—:
 * `npx tsx scripts/verificar-club-publico.ts`.
 */
import assert from "node:assert/strict";

import { clubDeSlug, clubPorDefecto } from "../src/features/publico/club-publico";
import type { Club } from "../src/features/clubes/types";

const club = (slug: string, tipo: "club" | "programa", orden: number) =>
  ({ id: slug, slug, nombre: slug, tipo, orden } as unknown as Club);

// El orden lo decide el administrador; la lista llega ya ordenada por la query.
const tsw = club("bmx-club-tsw", "club", 1);
const master = club("bmx-mastercross", "club", 2);
const programa = club("habilidades-motrices", "programa", 3);

const casos: [string, () => void][] = [
  [
    "sin slug se elige el primer CLUB por orden",
    () => assert.equal(clubPorDefecto([tsw, master, programa])?.slug, "bmx-club-tsw"),
  ],
  [
    "un programa de primero no se lleva el puesto: se salta al primer club",
    () => assert.equal(clubPorDefecto([programa, master])?.slug, "bmx-mastercross"),
  ],
  [
    "sin ningún club activo se cae al primer registro, aunque sea programa",
    () => assert.equal(clubPorDefecto([programa])?.slug, "habilidades-motrices"),
  ],
  [
    "con la lista vacía no hay nada que elegir",
    () => {
      assert.equal(clubPorDefecto([]), null);
      assert.equal(clubDeSlug([], "bmx-club-tsw"), null);
    },
  ],
  [
    "un slug que existe gana sobre el orden",
    () => assert.equal(clubDeSlug([tsw, master], "bmx-mastercross")?.slug, "bmx-mastercross"),
  ],
  [
    "un slug que no existe NO cae al primero en silencio",
    () => assert.equal(clubDeSlug([tsw, master], "no-existe"), null),
  ],
];

let fallas = 0;
console.log("");
for (const [nombre, comprobar] of casos) {
  try {
    comprobar();
    console.log(`  OK    ${nombre}`);
  } catch (error) {
    fallas += 1;
    console.log(` FALLA  ${nombre}\n        ${error instanceof Error ? error.message.split("\n")[0] : error}`);
  }
}
console.log("");
console.log(`Casos: ${casos.length}, fallidos: ${fallas}`);
console.log("");
if (fallas > 0) process.exit(1);
console.log("VALIDACIÓN LIMPIA");
