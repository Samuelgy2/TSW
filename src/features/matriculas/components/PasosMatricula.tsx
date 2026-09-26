import { PasosRuta, type PasoRuta } from "@/components/ui";
import { CONTACTO, SEDES_EN_LINEA, UBICACION } from "@/config/sitio";
import type { EntradaMatriculas } from "@/features/sitio/schemas";

/**
 * Los cuatro pasos del proceso, en la hoja de ruta del rediseño. Lo que el
 * club todavía no ha confirmado sale de `matriculas` (contenido_sitio,
 * migración 19, con el valor por defecto de config/contenido.ts si nadie lo
 * personalizó) entre corchetes; el resto describe el flujo tal como lo define
 * el README: descarga, diligenciamiento y radicación presencial.
 *
 * Recibe `matriculas` como prop en vez de leer la constante importada: así el
 * panel puede cambiar "firmas", "anexos" y "anexosPie" sin tocar código.
 */
export function PasosMatricula({ matriculas }: { matriculas: EntradaMatriculas }) {
  const pasos: PasoRuta[] = [
    {
      id: "descargar",
      numero: "01",
      etiqueta: "Descarga",
      titulo: "Descarga los documentos",
      texto: (
        <>
          <p>
            Baja los formatos vigentes de la lista de abajo. Cada archivo muestra su versión y su fecha
            de publicación: usa siempre el más reciente.
          </p>
          <p className="mt-2">Si un documento aparece como pendiente de publicar, aún no está disponible.</p>
        </>
      ),
      pie: "Impresión requerida",
    },
    {
      id: "diligenciar",
      numero: "02",
      etiqueta: "Formatos",
      titulo: "Diligencia e imprime",
      texto: (
        <>
          <p>Completa cada formato con los datos del deportista y de la persona responsable, e imprímelos.</p>
          <p className="mt-2">{matriculas.firmas}</p>
        </>
      ),
      pie: "Datos del deportista y del acudiente",
    },
    {
      id: "anexos",
      numero: "03",
      etiqueta: "Anexos",
      titulo: "Reúne los anexos",
      texto: (
        <>
          <p>Junto con los formatos diligenciados, prepara:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {matriculas.anexos.map((anexo) => (
              <li key={anexo}>{anexo}</li>
            ))}
          </ul>
        </>
      ),
      pie: matriculas.anexosPie,
    },
    {
      id: "radicar",
      numero: "04",
      etiqueta: "Presencial",
      titulo: "Radica en la sede",
      texto: (
        <>
          <p>Entrega la carpeta completa en la sede del club. No hay radicación en línea.</p>
          <dl className="mt-3 grid gap-2">
            <div>
              <dt className="font-semibold text-azul-profundo">Sedes</dt>
              <dd>
                {SEDES_EN_LINEA} — {UBICACION}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-azul-profundo">Horario de atención</dt>
              <dd>{CONTACTO.horario}</dd>
            </div>
          </dl>
        </>
      ),
      pie: "Solo en sede",
    },
  ];

  return <PasosRuta pasos={pasos} etiqueta="Pasos del proceso de matrícula" />;
}
