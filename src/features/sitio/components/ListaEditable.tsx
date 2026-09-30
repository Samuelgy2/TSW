"use client";

import { Boton, Campo } from "@/components/ui";

/**
 * Editor de un array de objetos planos con id: pilares, cifras, canales de
 * sede, categorías de matrícula, preguntas frecuentes, beneficios de la
 * tienda. Todas comparten la misma interacción —añadir, editar en línea,
 * quitar—, así que es UN componente y no seis formularios casi iguales.
 *
 * No lleva validación propia: el borrador se guarda entero con
 * `guardarSeccionContenido`, que corre el mismo esquema Zod que la lectura
 * pública. Si algo queda mal, el mensaje de error lo dice al guardar.
 */
export function ListaEditable<T extends { id: string }>({
  etiqueta,
  items,
  alCambiar,
  campos,
  crearVacio,
  reordenable,
  errorDe,
  etiquetaAnadir = "Añadir",
}: {
  etiqueta: string;
  items: T[];
  alCambiar: (items: T[]) => void;
  /**
   * Un campo por entrada del objeto, en el orden en que se vean. `numerico`
   * guarda un entero (o null si está vacío) en vez de texto.
   */
  campos: { clave: keyof T & string; etiqueta: string; areaTexto?: boolean; numerico?: boolean; maxLength?: number }[];
  /** Fila nueva al pulsar "Añadir", con un id fresco. */
  crearVacio: () => T;
  /** Muestra ↑↓ en cada fila. */
  reordenable?: boolean;
  /** Mensaje de error de un campo de una fila, o undefined si está bien. */
  errorDe?: (item: T, clave: keyof T & string) => string | undefined;
  etiquetaAnadir?: string;
}) {
  function actualizarCampo(indice: number, clave: keyof T & string, texto: string, numerico?: boolean) {
    const valor = numerico ? (texto.replace(/\D/g, "") === "" ? null : Number(texto.replace(/\D/g, ""))) : texto;
    alCambiar(items.map((item, i) => (i === indice ? { ...item, [clave]: valor } : item)));
  }

  function mover(indice: number, salto: -1 | 1) {
    const copia = [...items];
    copia.splice(indice + salto, 0, ...copia.splice(indice, 1));
    alCambiar(copia);
  }

  function quitar(indice: number) {
    alCambiar(items.filter((_, i) => i !== indice));
  }

  function anadir() {
    alCambiar([...items, crearVacio()]);
  }

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-sm font-semibold text-azul-profundo">{etiqueta}</legend>

      {items.length === 0 && (
        <p className="text-sm text-texto-sec">Todavía no hay ninguno. Añade el primero abajo.</p>
      )}

      <div className="flex flex-col gap-4">
        {items.map((item, indice) => (
          <div key={item.id} className="rounded-lg border border-gris-borde bg-blanco p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {campos.map((campo) =>
                campo.areaTexto ? (
                  <textarea
                    key={campo.clave}
                    aria-label={campo.etiqueta}
                    placeholder={campo.etiqueta}
                    value={String(item[campo.clave] ?? "")}
                    onChange={(e) => actualizarCampo(indice, campo.clave, e.target.value)}
                    rows={3}
                    className="min-h-[44px] w-full rounded-md border-2 border-gris-borde bg-blanco px-3 py-2 text-base text-azul-profundo focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco sm:col-span-2"
                  />
                ) : (
                  <Campo
                    key={campo.clave}
                    etiqueta={campo.etiqueta}
                    value={String(item[campo.clave] ?? "")}
                    onChange={(e) => actualizarCampo(indice, campo.clave, e.target.value, campo.numerico)}
                    inputMode={campo.numerico ? "numeric" : undefined}
                    maxLength={campo.maxLength}
                    error={errorDe?.(item, campo.clave)}
                  />
                ),
              )}
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              {reordenable && (
                <>
                  <Boton
                    variante="fantasma"
                    tamano="sm"
                    onClick={() => mover(indice, -1)}
                    disabled={indice === 0}
                    aria-label={`Subir ${etiqueta.toLowerCase()} ${indice + 1}`}
                  >
                    ↑
                  </Boton>
                  <Boton
                    variante="fantasma"
                    tamano="sm"
                    onClick={() => mover(indice, 1)}
                    disabled={indice === items.length - 1}
                    aria-label={`Bajar ${etiqueta.toLowerCase()} ${indice + 1}`}
                  >
                    ↓
                  </Boton>
                </>
              )}
              <Boton variante="fantasma" tamano="sm" onClick={() => quitar(indice)}>
                Quitar
              </Boton>
            </div>
          </div>
        ))}
      </div>

      <div>
        <Boton variante="secundario" tamano="sm" onClick={anadir}>
          {etiquetaAnadir}
        </Boton>
      </div>
    </fieldset>
  );
}

/**
 * Lo mismo que arriba pero para un array de CADENAS sueltas: los puntos
 * destacados de un deporte, los anexos de matrícula. Sin id porque un string
 * no tiene uno; la posición en el array es su identidad mientras se edita.
 */
export function ListaTextoEditable({
  etiqueta,
  items,
  alCambiar,
}: {
  etiqueta: string;
  items: string[];
  alCambiar: (items: string[]) => void;
}) {
  function actualizar(indice: number, valor: string) {
    alCambiar(items.map((item, i) => (i === indice ? valor : item)));
  }
  function quitar(indice: number) {
    alCambiar(items.filter((_, i) => i !== indice));
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold text-azul-profundo">{etiqueta}</legend>
      {items.map((item, indice) => (
        <div key={indice} className="flex items-end gap-2">
          <Campo
            etiqueta={`${etiqueta} ${indice + 1}`}
            value={item}
            onChange={(e) => actualizar(indice, e.target.value)}
            className="flex-1"
          />
          <Boton variante="fantasma" tamano="sm" onClick={() => quitar(indice)}>
            Quitar
          </Boton>
        </div>
      ))}
      <div>
        <Boton variante="secundario" tamano="sm" onClick={() => alCambiar([...items, ""])}>
          Añadir
        </Boton>
      </div>
    </fieldset>
  );
}
