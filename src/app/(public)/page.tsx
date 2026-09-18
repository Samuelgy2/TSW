import type { Metadata } from "next";

import { AccesosRapidos } from "@/components/home/AccesosRapidos";
import { FranjaCifras } from "@/components/home/FranjaCifras";
import { Hero } from "@/components/home/Hero";
import { Aparece } from "@/lib/animaciones";
import { Boton } from "@/components/ui";
import { SITIO } from "@/config/sitio";

import { listarCompetenciasConResultados } from "@/features/competencias/queries";
import { UltimosResultados } from "@/features/competencias/components/UltimosResultados";
import { listarNiveles } from "@/features/niveles/queries";
import { SelectorNiveles } from "@/features/niveles/components/SelectorNiveles";
import { listarProductosDestacados } from "@/features/tienda/queries";
import { TarjetaProducto } from "@/features/tienda/components/TarjetaProducto";

export const metadata: Metadata = {
  description: SITIO.descripcion,
};

/**
 * Portada. Server Component: los tres bloques con datos se leen en el servidor
 * y bajan ya renderizados. Lo único que corre en el navegador es lo que tiene
 * estado —carrusel, pestañas de año, selector de niveles y contador del
 * carrito— y está aislado en sus propios componentes.
 */
export default async function PaginaInicio() {
  // En paralelo: tres consultas independientes no deben encadenarse.
  const [competencias, niveles, productos] = await Promise.all([
    listarCompetenciasConResultados(),
    listarNiveles(),
    listarProductosDestacados(4),
  ]);

  return (
    <>
      <Hero />
      <FranjaCifras />
      <AccesosRapidos />
      <UltimosResultados competencias={competencias} />
      <SelectorNiveles niveles={niveles} />

      <section aria-labelledby="titulo-destacados" className="bg-gris-frio">
        <div className="contenedor py-16 lg:py-20">
          <Aparece>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="titulo-destacados" className="text-3xl sm:text-4xl">
                  Del club, para el club
                </h2>
                <p className="mt-2 max-w-2xl text-texto-sec">
                  Uniformes, protección y merchandising oficial.
                </p>
              </div>
              <Boton href="/tienda" variante="secundario">
                Ver toda la tienda
              </Boton>
            </div>
          </Aparece>

          {productos.length === 0 ? (
            <p className="mt-8 text-texto-sec">
              Todavía no hay productos publicados. Aparecerán aquí en cuanto se activen.
            </p>
          ) : (
            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {productos.map((producto, i) => (
                <Aparece key={producto.id} indice={i} como="li">
                  <TarjetaProducto producto={producto} />
                </Aparece>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
