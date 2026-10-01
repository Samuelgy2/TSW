import type { Metadata } from "next";
import { Aparece } from "@/lib/animaciones";
import {
  Acordeon,
  Aviso,
  BloqueCTA,
  Boton,
  BotonWhatsApp,
  Card,
  CardCuerpo,
  HeroPagina,
  Indicador,
  LogoClub,
  Seccion,
  SeccionTitulo,
} from "@/components/ui";
import { listarClubes } from "@/features/clubes/queries";
import type { Club } from "@/features/clubes/types";
import { FichaNiveles } from "@/features/niveles/components/FichaNiveles";
import { listarNiveles } from "@/features/niveles/queries";
import { resolverImagenSitio } from "@/features/sitio/imagenes";
import { obtenerSemilleros } from "@/features/sitio/queries";
import type { EntradaSemilleros } from "@/features/sitio/schemas";
import { SelectorClubPublico } from "@/features/publico/components/SelectorClubPublico";
import { clubDeParametros, clubPorDefecto, type ParametrosBusqueda } from "@/features/publico/club-publico";

const TITULO = "Niveles de formación";
const DESCRIPCION =
  "Niveles Minirider, Intermedio y Avanzado de BMX Club TSW y BMX Mastercross: edades, horarios y cómo avanzar. Clase de prueba gratis.";

/**
 * El `canonical` apunta a `/semilleros` a secas cuando el `?club=` pedido no
 * existe: esa URL muestra el club por defecto, así que sin canónica quedarían
 * dos direcciones indexables con el mismo contenido y una de ellas prometiendo
 * un club que no está.
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const [clubes, parametros] = await Promise.all([listarClubes(), searchParams]);
  const seleccion = clubDeParametros(clubes, parametros);

  return {
    title: TITULO,
    description: DESCRIPCION,
    openGraph: { title: `${TITULO} | TSW`, description: DESCRIPCION, type: "website" },
    ...(seleccion.estado === "desconocido" ? { alternates: { canonical: "/semilleros" } } : {}),
  };
}

type Props = { searchParams: Promise<ParametrosBusqueda> };

/**
 * Niveles de formación, por club.
 *
 * Qué se ve sin `?club`: el primer registro de `tipo = "club"` por orden. Por
 * orden, porque lo decide el administrador desde el panel; y filtrando por
 * tipo, porque si alguien reordena y queda un programa de primero, esta página
 * abriría en Habilidades Motrices, que no tiene niveles. Hoy es BMX Club TSW,
 * "el club de la casa" según el documento del cliente.
 *
 * Qué pasa con un slug que no existe o cuyo club está inactivo: se muestra el
 * club por defecto CON UN AVISO que lo dice. No en silencio —la URL diría un
 * club y la página mostraría otro— y no con un 404 —un enlace viejo del menú
 * o de un mensaje de WhatsApp debe llevar a algo útil, con el selector a la
 * vista—.
 *
 * Empecé por `redirect("/semilleros")`, que parecía más limpio, y no sirve
 * aquí: el layout público es asíncrono (lee los clubes para el menú), así que
 * la respuesta ya empezó a transmitirse cuando la página resuelve el club.
 * Next no puede mandar un 307 entonces y degrada a un `<meta http-equiv=
 * "refresh" content="1;url=…">`: un segundo de página a medio pintar antes
 * del salto. Medido, no supuesto.
 *
 * Habilidades Motrices no tiene niveles y no es un descuido: es un PROGRAMA.
 * La rama va por `tipo === "programa"`, nunca por el slug, porque la regla
 * sale del dato. El día que la corporación sume otro programa, funciona solo.
 */
export default async function PaginaSemilleros({ searchParams }: Props) {
  const [clubes, semilleros, parametros] = await Promise.all([
    listarClubes(),
    obtenerSemilleros(),
    searchParams,
  ]);
  const seleccion = clubDeParametros(clubes, parametros);

  if (clubes.length === 0) return <SinClubes />;

  const desconocido = seleccion.estado === "desconocido";
  const club = seleccion.club ?? clubPorDefecto(clubes)!;
  const esPrograma = club.tipo === "programa";
  const niveles = esPrograma ? [] : await listarNiveles(club.id);

  return (
    <>
      <HeroPagina
        tono="oscuro"
        antetitulo="Formación"
        titulo={club.nombre}
        bajada={
          esPrograma
            ? "Sesiones personalizadas para todas las edades, como base para el BMX o para cualquier otro deporte."
            : "En BMX el nivel lo define la habilidad, no solo la edad. Por eso los rangos se cruzan: cada rider entra al grupo que corresponde a lo que ya domina y avanza cuando está listo."
        }
        lateral={
          <SelectorClubPublico
            clubes={clubes.map((c) => ({ slug: c.slug, nombre: c.nombre }))}
            valor={club.slug}
            fondo="oscuro"
          />
        }
      />

      <Seccion tono="oscuro" espaciado="compacto" className="border-t border-blanco/10" tituloId="titulo-club">
        <h2 id="titulo-club" className="sr-only">
          {club.nombre}
        </h2>
        {desconocido && (
          <Aviso tono="aviso" className="mb-6">
            El club o programa que pedías ya no está publicado. Te mostramos {club.nombre}; puedes
            cambiarlo con el selector de arriba.
          </Aviso>
        )}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <LogoClub
            nombre={club.nombre}
            logoUrl={resolverImagenSitio(club.logo_path)}
            color={club.color_identidad}
            tamano="lg"
            oscuro
          />
          <div className="min-w-0">
            {club.etiqueta && (
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-acento">{club.etiqueta}</p>
            )}
            {club.descripcion && <p className="mt-2 max-w-3xl text-blanco/85">{club.descripcion}</p>}
          </div>
        </div>
      </Seccion>

      {esPrograma ? (
        <BloquePrograma club={club} />
      ) : (
        <BloqueNiveles niveles={niveles} clubNombre={club.nombre} cifras={semilleros.cifras} />
      )}

      <Seccion tono="claro" tituloId="titulo-preguntas">
        <Aparece>
          <SeccionTitulo id="titulo-preguntas">Preguntas frecuentes</SeccionTitulo>
        </Aparece>
        <Aparece indice={1} className="mt-8 max-w-3xl">
          <Acordeon items={[...semilleros.preguntas]} />
        </Aparece>
      </Seccion>

      <BloqueCTA
        tituloId="titulo-cta-semilleros"
        titulo="¿Listo para empezar?"
        texto="Agenda tu clase de prueba gratis o descarga los documentos de matrícula."
        acciones={
          <>
            <BotonWhatsApp
              texto="Hola, quiero agendar una clase de prueba gratis."
              fondo="franja"
              tamano="lg"
            >
              Escribir por WhatsApp
            </BotonWhatsApp>
            <Boton href="/matriculas" fondo="franja" variante="secundario" tamano="lg">
              Ver documentos de matrícula
            </Boton>
          </>
        }
      />
    </>
  );
}

/** Los niveles de un club, con las cifras de la metodología encima. */
function BloqueNiveles({
  niveles,
  clubNombre,
  cifras,
}: {
  niveles: Awaited<ReturnType<typeof listarNiveles>>;
  clubNombre: string;
  cifras: EntradaSemilleros["cifras"];
}) {
  return (
    <>
      <Seccion tono="oscuro" espaciado="compacto" tituloId="titulo-metodologia">
        <h2 id="titulo-metodologia" className="sr-only">
          La metodología en cifras
        </h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {cifras.map((cifra, i) => (
            <Aparece key={cifra.id} indice={i} como="li">
              <Indicador
                variante="cifra"
                oscuro
                etiqueta={cifra.etiqueta}
                valor={cifra.valor ?? "[CIFRA]"}
                detalle={cifra.detalle}
                className="h-full"
              />
            </Aparece>
          ))}
        </ul>
      </Seccion>

      <Seccion tituloId="titulo-niveles">
        <Aparece>
          <SeccionTitulo
            id="titulo-niveles"
            bajada="Elige un nivel para ver su ficha completa: edades, cupo, horarios y criterios de promoción."
          >
            Estructura por niveles
          </SeccionTitulo>
        </Aparece>
        <Aparece indice={1} className="mt-8">
          {niveles.length === 0 ? (
            <p className="rounded-lg border-2 border-dashed border-gris-borde bg-blanco px-6 py-10 text-center text-texto-sec">
              Este club todavía no tiene niveles publicados. Escríbenos por WhatsApp y te contamos
              cómo está organizada la formación.
            </p>
          ) : (
            <FichaNiveles niveles={niveles} clubNombre={clubNombre} />
          )}
        </Aparece>
      </Seccion>
    </>
  );
}

/**
 * Un programa no tiene niveles: tiene una modalidad. El bloque es distinto a
 * propósito, no una lista vacía con otro título.
 */
function BloquePrograma({ club }: { club: Club }) {
  const datos = [
    { etiqueta: "Modalidad", valor: "Personalizada" },
    { etiqueta: "Edades", valor: "Todas" },
    { etiqueta: "Horario", valor: "A convenir por WhatsApp" },
  ];

  return (
    <Seccion tituloId="titulo-programa">
      <Aparece>
        <SeccionTitulo
          id="titulo-programa"
          bajada="No va por niveles: cada sesión se arma según lo que esa persona necesita trabajar."
        >
          Cómo funciona el programa
        </SeccionTitulo>
      </Aparece>

      <Aparece indice={1} className="mt-8">
        <Card>
          <CardCuerpo>
            <p className="text-lg text-azul-profundo">
              Sesiones personalizadas para todas las edades. Trabajamos equilibrio, coordinación,
              agilidad y confianza según las necesidades de cada persona, como base para el BMX o
              para cualquier otro deporte.
            </p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-3">
              {datos.map((dato) => (
                <div key={dato.etiqueta}>
                  <dt className="text-xs font-bold uppercase tracking-[0.15em] text-texto-sec">
                    {dato.etiqueta}
                  </dt>
                  <dd className="mt-1 font-semibold text-azul-profundo">{dato.valor}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6">
              <BotonWhatsApp texto={`Hola, quiero información del programa de ${club.nombre}.`}>
                Consultar horarios por WhatsApp
              </BotonWhatsApp>
            </div>
          </CardCuerpo>
        </Card>
      </Aparece>
    </Seccion>
  );
}

/** Sin clubes activos no hay nada que elegir ni que listar. */
function SinClubes() {
  return (
    <>
      <HeroPagina
        tono="oscuro"
        antetitulo="Formación"
        titulo="Niveles de formación"
        bajada="Estamos actualizando la información de los clubes."
      />
      <Seccion tituloId="titulo-sin-clubes">
        <h2 id="titulo-sin-clubes" className="sr-only">
          Sin clubes publicados
        </h2>
        <p className="rounded-lg border-2 border-dashed border-gris-borde bg-blanco px-6 py-10 text-center text-texto-sec">
          Todavía no hay clubes ni programas publicados. Escríbenos por WhatsApp y te contamos la
          oferta de formación.
        </p>
      </Seccion>
    </>
  );
}
