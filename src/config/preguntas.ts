import type { ItemAcordeon } from "@/components/ui";

/**
 * Preguntas frecuentes de la página de semilleros. No viven en la base de
 * datos: cambian poco y las edita quien mantiene el sitio. Las respuestas son
 * placeholders hasta que el club confirme cada dato.
 */
export const PREGUNTAS_SEMILLEROS: ItemAcordeon[] = [
  {
    id: "edad",
    titulo: "¿Desde qué edad se puede ingresar?",
    contenido: "[Edad mínima de ingreso y si hay tope de edad. Indicar a qué nivel entra un deportista sin experiencia.]",
  },
  {
    id: "bicicleta",
    titulo: "¿Hay que tener bicicleta y protección propias?",
    contenido: "[Política del club sobre bicicletas y elementos de protección: si presta, alquila o exige equipo propio.]",
  },
  {
    id: "horarios",
    titulo: "¿Cuáles son los horarios de entrenamiento?",
    contenido: "Cada nivel tiene su franja. Está en la ficha de cada semillero, arriba en esta página.",
  },
  {
    id: "promocion",
    titulo: "¿Cómo se pasa de un nivel al siguiente?",
    contenido: "[Quién evalúa y con qué frecuencia. El criterio de promoción de cada nivel aparece en su ficha.]",
  },
  {
    id: "costos",
    titulo: "¿Cuánto cuesta la matrícula y la mensualidad?",
    contenido: "[Valores y formas de pago. No se publican hasta que el club los confirme.]",
  },
];
