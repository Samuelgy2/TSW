import { Aparece } from "@/lib/animaciones";
import { CardEnlace, CardCuerpo } from "@/components/ui";

const ACCESOS = [
  {
    href: "/matriculas",
    titulo: "Matrículas",
    texto: "Descarga los documentos, imprímelos y radícalos en la sede.",
    pie: "La radicación es presencial",
  },
  {
    href: "/tienda",
    titulo: "Tienda",
    texto: "Uniformes, protección y merchandising del club.",
    pie: "Pago en línea",
  },
  {
    href: "/competencias",
    titulo: "Competencias",
    texto: "Calendario y resultados de nuestros riders.",
    pie: "Resultados por año",
  },
] as const;

/** Tres puertas de entrada, una por objetivo del sitio. */
export function AccesosRapidos() {
  return (
    <section aria-labelledby="titulo-accesos" className="contenedor py-16 lg:py-20">
      <Aparece>
        <h2 id="titulo-accesos" className="text-3xl sm:text-4xl">
          ¿Qué necesitas hoy?
        </h2>
      </Aparece>

      <ul className="mt-8 grid gap-5 md:grid-cols-3">
        {ACCESOS.map((acceso, i) => (
          <Aparece key={acceso.href} indice={i + 1} como="li">
            <CardEnlace href={acceso.href} className="h-full">
              <CardCuerpo className="flex h-full flex-col">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-rojo">
                  {acceso.pie}
                </span>
                <h3 className="mt-3 text-2xl">{acceso.titulo}</h3>
                <p className="mt-2 flex-1 text-texto-sec">{acceso.texto}</p>
                <span
                  aria-hidden="true"
                  className="mt-5 inline-flex items-center gap-2 font-semibold text-azul-profundo transition-transform group-hover:translate-x-1"
                >
                  Entrar →
                </span>
              </CardCuerpo>
            </CardEnlace>
          </Aparece>
        ))}
      </ul>
    </section>
  );
}
