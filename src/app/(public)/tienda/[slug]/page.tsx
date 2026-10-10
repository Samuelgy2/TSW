import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Aparece } from "@/lib/animaciones";
import { Aviso, Badge, BotonWhatsApp, Seccion, SeccionTitulo } from "@/components/ui";
import { ErrorNoEncontrado } from "@/lib/errors/errores";
import { urlPublicaStorage } from "@/lib/supabase/storage";
import { TIENDA_MUESTRA_PRECIOS, TIENDA_QUE_CONFIRMA } from "@/config/sitio";
import { formatearPrecio } from "@/lib/utils";
import { obtenerProductoPorSlug, listarProductos } from "@/features/tienda/queries";
import {
  BUCKET_PRODUCTOS,
  disponible,
  precioDesde,
  etiquetaCategoria,
} from "@/features/tienda/types";
import { TarjetaProducto } from "@/features/tienda/components/TarjetaProducto";
import { SelectorVariantes } from "@/features/tienda/components/SelectorVariantes";

type Props = { params: Promise<{ slug: string }> };

/**
 * Sin generateStaticParams: la consulta pasa por el cliente de servidor con
 * cookies (RLS + sesión de Supabase), así que la ruta es dinámica como el
 * resto del sitio. Un slug inexistente (producto eliminado o desactivado) redirige a /tienda.
 */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const producto = await obtenerProductoPorSlug(slug);
    return {
      title: producto.nombre,
      description:
        producto.descripcion ??
        `${etiquetaCategoria(producto.categoria) ?? "Dotación"} oficial de la corporación TSW.`,
      openGraph: {
        title: `${producto.nombre} | TSW`,
        description: producto.descripcion ?? undefined,
        type: "website",
      },
    };
  } catch {
    return { title: "Producto no encontrado" };
  }
}

/**
 * Detalle de producto. Server Component: la ficha y la foto se leen en el
 * servidor; la talla, la cantidad y el carrito viven en la isla
 * SelectorVariantes.
 */
export default async function PaginaProducto({ params }: Props) {
  const { slug } = await params;

  let producto;
  try {
    producto = await obtenerProductoPorSlug(slug);
  } catch (error) {
    // Producto eliminado o desactivado: a la tienda, no a un 404.
    if (error instanceof ErrorNoEncontrado) redirect("/tienda");
    throw error;
  }

  const relacionados = (await listarProductos()).filter((p) => p.id !== producto.id).slice(0, 4);
  const foto = producto.imagen_path
    ? urlPublicaStorage(BUCKET_PRODUCTOS, producto.imagen_path)
    : "/imagenes/producto.jpg";
  const unidades = producto.variantes.reduce((t, v) => t + (v.activo ? disponible(v) : 0), 0);
  const desde = precioDesde(producto);

  return (
    <>
      <div className="bg-gris-frio">
        <div className="contenedor py-4 text-sm text-texto-sec">
          <nav aria-label="Migas de pan">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/tienda" className="underline hover:text-azul-profundo">
                  Tienda
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-azul-profundo">
                {producto.nombre}
              </li>
            </ol>
          </nav>
        </div>
      </div>

      <Seccion tituloId="titulo-producto">
        <div className="grid gap-10 lg:grid-cols-2">
          <Aparece>
            <div className="relative aspect-square overflow-hidden rounded-lg border border-gris-borde bg-gris-frio">
              <Image
                src={foto}
                alt={producto.imagen_path ? `Foto de ${producto.nombre}` : `[Foto de ${producto.nombre}]`}
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </Aparece>

          <Aparece indice={1}>
            <div>
              {etiquetaCategoria(producto.categoria) && (
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-texto-sec">
                  {etiquetaCategoria(producto.categoria)}
                </span>
              )}
              <h1 id="titulo-producto" className="mt-2 text-3xl sm:text-4xl">
                {producto.nombre}
              </h1>

              {TIENDA_MUESTRA_PRECIOS && (
                <p className="mt-4 font-display text-3xl text-azul-profundo">
                  {desde === null ? (
                    <span className="text-lg font-normal text-texto-sec">Precio pendiente</span>
                  ) : (
                    <>
                      <span className="text-base font-normal text-texto-sec">Desde </span>
                      {formatearPrecio(desde)}
                    </>
                  )}
                </p>
              )}

              {producto.descripcion && (
                <p className="mt-4 leading-relaxed text-texto-sec">{producto.descripcion}</p>
              )}

              {unidades > 0 && unidades <= 5 && (
                <div className="mt-4">
                  <Badge tono="acento">¡Últimas {unidades} unidades!</Badge>
                </div>
              )}

              <div className="mt-8 border-t border-gris-borde pt-8">
                <SelectorVariantes producto={producto} />
              </div>

              <div className="mt-8 flex flex-col gap-4">
                <Aviso tono="info" titulo="Cómo funciona el pedido">
                  Elige talla y cantidad, agrégalo al carrito y envía el pedido por WhatsApp con
                  el mensaje ya escrito: {TIENDA_QUE_CONFIRMA}.
                </Aviso>
                <div>
                  <BotonWhatsApp variante="secundario">¿Tienes dudas? Escríbenos</BotonWhatsApp>
                </div>
              </div>
            </div>
          </Aparece>
        </div>
      </Seccion>

      {relacionados.length > 0 && (
        <Seccion tono="claro" tituloId="titulo-relacionados">
          <Aparece>
            <SeccionTitulo id="titulo-relacionados">También te puede interesar</SeccionTitulo>
          </Aparece>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {relacionados.map((p, i) => (
              <Aparece key={p.id} indice={i} como="li">
                <TarjetaProducto producto={p} />
              </Aparece>
            ))}
          </ul>
        </Seccion>
      )}
    </>
  );
}
