import type { Metadata } from "next";

import { Aparece } from "@/lib/animaciones";
import { BloqueCTA, BotonWhatsApp, Card, CardCuerpo, HeroPagina, Seccion, SeccionTitulo } from "@/components/ui";
import { listarProductos } from "@/features/tienda/queries";
import { CatalogoProductos } from "@/features/tienda/components/CatalogoProductos";
import { TIENDA_QUE_CONFIRMA } from "@/config/sitio";
import { obtenerDeportes, obtenerTienda } from "@/features/sitio/queries";
import { SelectorDeportePublico } from "@/features/publico/components/SelectorDeportePublico";
import { deporteDeParametros, type ParametrosBusqueda } from "@/features/publico/deporte-publico";

const TITULO = "Tienda";
const DESCRIPCION =
  "Dotación oficial, protección y merchandising de la corporación deportiva TSW. Elige talla y envía tu pedido por WhatsApp.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  openGraph: { title: `${TITULO} | TSW`, description: DESCRIPCION, type: "website" },
};

type Props = { searchParams: Promise<ParametrosBusqueda> };

/**
 * Catálogo público. Server Component: una sola consulta; los filtros y la
 * búsqueda son una isla de cliente que recibe la lista ya lista.
 *
 * El deporte todavía no filtra el catálogo: `producto` no tiene `deporte_id`.
 * Cuando lo tenga, la dotación se filtra por deporte y el merchandising
 * (deporte nulo) aparece bajo todos.
 */
export default async function PaginaTienda({ searchParams }: Props) {
  const [productos, deportes, tienda, parametros] = await Promise.all([
    listarProductos(),
    obtenerDeportes(),
    obtenerTienda(),
    searchParams,
  ]);
  const deporte = deporteDeParametros(parametros, deportes);

  return (
    <>
      <HeroPagina
        antetitulo="Dotación oficial"
        titulo={`Tienda · ${deporte.nombre}`}
        bajada={`Uniformes, protección y merchandising de la corporación. Elige producto y talla, y envía el pedido por WhatsApp: ${TIENDA_QUE_CONFIRMA}.`}
        lateral={<SelectorDeportePublico deportes={deportes} valor={deporte.id} />}
      />

      <Seccion espaciado="compacto" tituloId="titulo-beneficios" className="border-b border-gris-borde">
        <h2 id="titulo-beneficios" className="sr-only">
          Cómo funciona la tienda
        </h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {tienda.beneficios.map((beneficio, i) => (
            <Aparece key={beneficio.id} indice={i} como="li">
              <Card className="h-full">
                <CardCuerpo className="flex items-start gap-4 p-4">
                  <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-azul-profundo">
                    <span className="h-2.5 w-2.5 rounded-full bg-acento-oscuro" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold uppercase tracking-wide text-azul-profundo">{beneficio.titulo}</span>
                    <span className="mt-1 block text-sm text-texto-sec">{beneficio.texto}</span>
                  </span>
                </CardCuerpo>
              </Card>
            </Aparece>
          ))}
        </ul>
      </Seccion>

      <Seccion tituloId="titulo-catalogo">
        <Aparece>
          <SeccionTitulo id="titulo-catalogo" bajada="Filtra por categoría o busca por nombre.">
            Catálogo
          </SeccionTitulo>
        </Aparece>
        <Aparece indice={1} className="mt-8">
          {productos.length === 0 ? (
            <p
              role="status"
              className="rounded-lg border-2 border-dashed border-gris-borde bg-blanco px-6 py-10 text-center text-texto-sec"
            >
              Todavía no hay productos publicados. Aparecerán aquí en cuanto se activen.
            </p>
          ) : (
            <CatalogoProductos productos={productos} />
          )}
        </Aparece>
      </Seccion>

      <BloqueCTA
        tituloId="titulo-cta-tienda"
        titulo="¿Dudas con las tallas?"
        texto="Escríbenos antes de pedir: te ayudamos a elegir la talla correcta para evitar cambios."
        acciones={
          <BotonWhatsApp fondo="franja" variante="secundario" tamano="lg">
            ¿Tienes dudas? Escríbenos
          </BotonWhatsApp>
        }
      />
    </>
  );
}
