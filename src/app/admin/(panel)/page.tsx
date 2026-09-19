import type { Metadata } from "next";

import { PaginaPanel } from "@/components/admin/PaginaPanel";
import { Boton, EstadoVacio, Indicador } from "@/components/ui";
import { exigirSesionPagina } from "@/lib/auth";
import { UltimosEventos } from "@/features/admin/components/UltimosEventos";
import { listarAuditoria, resumenPanel } from "@/features/admin/queries";

export const metadata: Metadata = { title: "Inicio" };

/** Inicio del panel: cuatro cifras y los últimos cambios. */
export default async function PaginaInicioPanel() {
  const { usuario } = await exigirSesionPagina("/admin");
  const [resumen, eventos] = await Promise.all([resumenPanel(), listarAuditoria(5)]);

  return (
    <PaginaPanel
      titulo="Inicio"
      descripcion="Resumen del sitio y últimos cambios."
      accion={
        <Boton href="/" variante="secundario" externo>
          Ver el sitio público
        </Boton>
      }
    >
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <li>
          <Indicador
            etiqueta="Descargas del mes"
            valor={resumen.descargasDelMes}
            detalle="Sin registro todavía: el esquema no guarda descargas."
          />
        </li>
        <li>
          <Indicador
            etiqueta="Pedidos pendientes"
            valor={resumen.pedidosPendientes}
            detalle="Esperando pago en Wompi."
            href="/admin/pedidos?estado=pendiente"
          />
        </li>
        <li>
          <Indicador
            etiqueta="Pedidos pagados"
            valor={resumen.pedidosPagados}
            detalle="Con pago confirmado, en cualquier estado posterior."
            href="/admin/pedidos?estado=pagado"
          />
        </li>
        <li>
          <Indicador
            etiqueta="Publicaciones activas"
            valor={resumen.competenciasPublicadas}
            detalle="Competencias en estado publicado."
            href="/admin/competencias"
          />
        </li>
      </ul>

      <section aria-labelledby="titulo-ultimos" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="titulo-ultimos" className="text-xl">
            Últimos cambios
          </h2>
          <Boton href="/admin/bitacora" variante="fantasma" tamano="sm">
            Ver toda la bitácora
          </Boton>
        </div>
        <div className="mt-4">
          {eventos.length === 0 ? (
            <EstadoVacio
              titulo="Todavía no hay cambios registrados"
              texto="Cada creación, edición o publicación desde el panel aparecerá aquí con quién la hizo."
            />
          ) : (
            <UltimosEventos eventos={eventos} actorActual={{ id: usuario.id, correo: usuario.email ?? "" }} />
          )}
        </div>
      </section>
    </PaginaPanel>
  );
}
