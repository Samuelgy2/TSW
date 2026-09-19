"use client";

import { Boton } from "./Boton";

export type PieModalProps = {
  alCerrar: () => void;
  /** Envío en curso: deshabilita ambos botones para evitar el doble clic. */
  cargando?: boolean;
  onGuardar: () => void;
  etiquetaGuardar?: string;
};

/**
 * Pie estándar de los modales del panel: cancelar a la izquierda (debajo en
 * móvil) y la acción principal a la derecha, con estado de carga. Los modales
 * de los bloques A y B lo repetían a mano en cada archivo; la densidad del
 * panel no justifica tres copias del mismo pie.
 */
export function PieModal({ alCerrar, cargando = false, onGuardar, etiquetaGuardar = "Guardar" }: PieModalProps) {
  return (
    <div className="mt-2 flex flex-col gap-3 border-t border-gris-borde p-5 sm:flex-row sm:justify-end">
      <Boton variante="fantasma" onClick={alCerrar} disabled={cargando}>
        Cancelar
      </Boton>
      <Boton onClick={onGuardar} cargando={cargando}>
        {etiquetaGuardar}
      </Boton>
    </div>
  );
}
