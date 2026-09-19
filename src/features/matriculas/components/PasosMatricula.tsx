import { SelectorDetalle, type ItemSelectorDetalle } from "@/components/ui";
import { CONTACTO } from "@/config/sitio";

/**
 * Los cuatro pasos del proceso. Lo que el club todavía no ha confirmado va
 * entre corchetes; el resto describe el flujo tal como lo define el README:
 * descarga, diligenciamiento y radicación presencial.
 */
const PASOS: ItemSelectorDetalle[] = [
  {
    id: "descargar",
    numero: "01",
    titulo: "Descarga los documentos",
    resumen: "Desde esta misma página",
    contenido: (
      <>
        <p className="text-texto-sec">
          Baja los formatos vigentes de la lista de abajo. Cada archivo muestra su versión y su
          fecha de publicación: usa siempre el más reciente.
        </p>
        <p className="mt-3 text-texto-sec">
          Si un documento aparece como pendiente de publicar, aún no está disponible.
        </p>
      </>
    ),
  },
  {
    id: "diligenciar",
    numero: "02",
    titulo: "Diligencia e imprime",
    resumen: "Datos del deportista y del acudiente",
    contenido: (
      <>
        <p className="text-texto-sec">
          Completa cada formato con los datos del deportista y de la persona responsable, e
          imprímelos.
        </p>
        <p className="mt-3 text-texto-sec">[Indicar si se firman a mano o se aceptan firmas digitales.]</p>
      </>
    ),
  },
  {
    id: "anexos",
    numero: "03",
    titulo: "Reúne los anexos",
    resumen: "Lo que acompaña a los formatos",
    contenido: (
      <>
        <p className="text-texto-sec">Junto con los formatos diligenciados, prepara:</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-texto-sec">
          <li>[Documento de identidad del deportista]</li>
          <li>[Documento de identidad del acudiente]</li>
          <li>[Certificado médico o afiliación a salud]</li>
          <li>[Otros anexos que pida el club]</li>
        </ul>
      </>
    ),
  },
  {
    id: "radicar",
    numero: "04",
    titulo: "Radica en la sede",
    resumen: "La radicación es presencial",
    contenido: (
      <>
        <p className="text-texto-sec">
          Entrega la carpeta completa en la sede del club. No hay radicación en línea.
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-azul-profundo">Dirección</dt>
            <dd className="text-texto-sec">
              {CONTACTO.direccion}, {CONTACTO.ciudad}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-azul-profundo">Horario de atención</dt>
            <dd className="text-texto-sec">{CONTACTO.horario}</dd>
          </div>
        </dl>
      </>
    ),
  },
];

/** Proceso de matrícula: lista y panel en escritorio, acordeón en móvil. */
export function PasosMatricula() {
  return <SelectorDetalle items={PASOS} etiqueta="Pasos del proceso de matrícula" />;
}
