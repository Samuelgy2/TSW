import { Aparece } from "@/lib/animaciones";
import { EstadoVacio, ItemDescarga } from "@/components/ui";
import { urlPublicaStorage } from "@/lib/supabase/storage";
import { formatearFecha } from "@/lib/utils";
import { BUCKET_DOCUMENTOS, type DocumentoConVersion } from "../types";

function formatearTamano(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/**
 * Documentos de matrícula con su versión vigente. Server Component: la URL
 * del PDF se arma en el servidor a partir del bucket público.
 */
export function ListaDocumentos({ documentos }: { documentos: DocumentoConVersion[] }) {
  if (documentos.length === 0) {
    return (
      <EstadoVacio
        titulo="Todavía no hay documentos publicados"
        texto="Los formatos de matrícula aparecerán aquí en cuanto el club los publique."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {documentos.map((documento, i) => {
        const version = documento.version_vigente;
        return (
          <Aparece key={documento.id} indice={i} como="li">
            <ItemDescarga
              titulo={documento.titulo}
              descripcion={documento.descripcion}
              meta={
                version
                  ? [
                      `Versión ${version.version}`,
                      `Publicado el ${formatearFecha(version.publicado_en)}`,
                      formatearTamano(version.tamano_bytes),
                    ]
                  : []
              }
              href={version ? urlPublicaStorage(BUCKET_DOCUMENTOS, version.storage_path) : undefined}
              nombreArchivo={version?.nombre_archivo}
            />
          </Aparece>
        );
      })}
    </ul>
  );
}
