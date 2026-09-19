import type { Metadata } from "next";

import {
  Acordeon,
  AreaTexto,
  Aviso,
  Badge,
  BloqueCTA,
  Boton,
  Campo,
  Card,
  CardCuerpo,
  CardEnlace,
  CardTitulo,
  ChipEstado,
  EstadoVacio,
  HeroPagina,
  Indicador,
  ItemDescarga,
  Seccion,
  SeccionTitulo,
  Select,
  SelectorDetalle,
  Skeleton,
  SkeletonFilas,
  SkeletonHero,
  SkeletonTarjeta,
  SkeletonTexto,
  TablaResponsiva,
  type ColumnaTabla,
} from "@/components/ui";
import { Hero } from "@/components/home/Hero";

import {
  DemoArchivo,
  DemoBotonCargando,
  DemoCampoMoneda,
  DemoEstadoError,
  DemoFiltros,
  DemoModal,
  DemoPieModal,
  DemoStepper,
  DemoTabs,
  DemoTabsLargas,
} from "./DemosInteractivas";

export const metadata: Metadata = {
  title: "Laboratorio de componentes",
  // Página temporal: no debe indexarse ni enlazarse desde el sitio.
  robots: { index: false, follow: false },
};

/**
 * Muestra cada primitivo del sistema de diseño en sus variantes y estados.
 * Se borra al cerrar la fase 2.
 */
export default function PaginaLaboratorio() {
  return (
    <>
      <Seccion tono="oscuro" tituloId="titulo-laboratorio" espaciado="compacto">
        <h1 id="titulo-laboratorio" className="text-3xl sm:text-4xl">
          Laboratorio
        </h1>
        <p className="mt-2 text-blanco/85">
          Primitivos de <code className="font-mono text-sm">src/components/ui/</code>. Página
          temporal, sin indexar.
        </p>
      </Seccion>

      {/* --- Carrusel del hero -------------------------------------------- */}
      <Seccion tono="claro" tituloId="titulo-carrusel" espaciado="compacto">
        <SeccionTitulo
          id="titulo-carrusel"
          bajada="scroll-snap nativo, inert en las ocultas, pausa visible, flechas ←→ con el foco dentro. Se detiene con cursor, foco, pestaña oculta y movimiento reducido."
        >
          Carrusel del hero
        </SeccionTitulo>
      </Seccion>
      <Hero />

      {/* --- Colorimetría ----------------------------------------------- */}
      <Seccion tituloId="titulo-colores">
        <SeccionTitulo id="titulo-colores" bajada="Variables en globals.css, expuestas a Tailwind con @theme.">
          Colorimetría
        </SeccionTitulo>
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {COLORES.map((color) => (
            <li key={color.nombre} className="overflow-hidden rounded-lg border border-gris-borde">
              <div className={`h-20 ${color.clase}`} aria-hidden="true" />
              <div className="p-3">
                <p className="font-semibold">{color.nombre}</p>
                <p className="font-mono text-sm text-texto-sec">{color.hex}</p>
                <p className="mt-1 text-sm text-texto-sec">{color.uso}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-azul-profundo p-5 text-blanco">
            <p className="text-2xl font-display text-rojo">Rojo sobre azul profundo</p>
            <p className="mt-2 text-sm text-blanco/85">
              3.47:1. Solo texto grande (≥24px) o elementos de interfaz: barras, indicadores.
              Nunca texto corrido.
            </p>
          </div>
          <div className="rounded-lg bg-rojo p-5 text-blanco">
            <p className="text-2xl font-display">Blanco sobre rojo</p>
            <p className="mt-2 text-sm">4.96:1. Es el par de los botones primarios.</p>
          </div>
        </div>
      </Seccion>

      {/* --- Tipografía --------------------------------------------------- */}
      <Seccion tono="claro" tituloId="titulo-tipografia">
        <SeccionTitulo id="titulo-tipografia" bajada="Archivo Black para títulos, Barlow para cuerpo y UI.">
          Tipografía
        </SeccionTitulo>
        <div className="mt-8 flex flex-col gap-6">
          <p className="titulo-hero font-display uppercase">Titular del hero</p>
          <p className="text-sm text-texto-sec">
            <code className="font-mono">.titulo-hero</code>: clamp(2rem, 1rem + 5vw, 4.875rem). 34px
            a 360px, 78px a 1440px.
          </p>
          <div className="flex flex-col gap-3">
            <p className="font-display text-4xl uppercase">Título h1 · 36px</p>
            <p className="font-display text-3xl uppercase">Título h2 · 30px</p>
            <p className="font-display text-2xl uppercase">Título h3 · 24px</p>
            <p className="font-display text-lg uppercase">Título h4 · 18px</p>
          </div>
          <div className="flex max-w-2xl flex-col gap-3">
            <p className="text-lg">Bajada · 18px. Formación desde la iniciación hasta la competencia.</p>
            <p>Cuerpo · 16px. Los documentos de matrícula se descargan desde esta página y se radican en la sede.</p>
            <p className="text-sm text-texto-sec">Secundario · 14px, texto-sec. Versión 3 · publicado el [fecha].</p>
          </div>
        </div>
      </Seccion>

      {/* --- Botones ------------------------------------------------------ */}
      <Seccion tituloId="titulo-botones">
        <SeccionTitulo
          id="titulo-botones"
          bajada="Tres variantes, tamaños sm/md/lg, siempre <button> o <a> reales, 44px mínimo."
        >
          Botones
        </SeccionTitulo>

        <div className="mt-8 flex flex-col gap-8">
          <Grupo titulo="Variantes · md">
            <Boton>Primario</Boton>
            <Boton variante="secundario">Secundario</Boton>
            <Boton variante="fantasma">Fantasma</Boton>
          </Grupo>

          <Grupo titulo="Tamaños">
            <Boton tamano="sm">Pequeño</Boton>
            <Boton tamano="md">Mediano</Boton>
            <Boton tamano="lg">Grande</Boton>
          </Grupo>

          <Grupo titulo="Estados">
            <Boton disabled>Deshabilitado</Boton>
            <Boton variante="secundario" disabled>
              Deshabilitado
            </Boton>
            <Boton href="/tienda">Enlace interno (Link)</Boton>
            <Boton href="https://wompi.co" externo variante="secundario">
              Enlace externo
            </Boton>
          </Grupo>

          <Grupo titulo="asChild · presta las clases a un <a> con atributos propios">
            <Boton asChild variante="secundario">
              <a href="/documentos/[archivo].pdf" download>
                Descargar PDF
              </a>
            </Boton>
          </Grupo>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-texto-sec">Ancho completo · móvil</p>
            <div className="max-w-xs">
              <Boton completo>Agregar al carrito</Boton>
            </div>
          </div>
        </div>
      </Seccion>

      <Seccion tono="oscuro" tituloId="titulo-botones-oscuro">
        <SeccionTitulo id="titulo-botones-oscuro" bajada="fondo=&quot;oscuro&quot;: secundario y fantasma pasan a blanco.">
          Botones sobre azul profundo
        </SeccionTitulo>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Boton fondo="oscuro">Primario</Boton>
          <Boton fondo="oscuro" variante="secundario">
            Secundario
          </Boton>
          <Boton fondo="oscuro" variante="fantasma">
            Fantasma
          </Boton>
          <Boton fondo="oscuro" variante="secundario" disabled>
            Deshabilitado
          </Boton>
        </div>
      </Seccion>

      <Seccion tono="acento" tituloId="titulo-botones-acento" espaciado="compacto">
        <SeccionTitulo
          id="titulo-botones-acento"
          bajada="fondo=&quot;acento&quot;: el primario se invierte a blanco con texto rojo. Solo en franjas de cierre (BloqueCTA)."
        >
          Botones sobre rojo
        </SeccionTitulo>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Boton fondo="acento">Primario</Boton>
          <Boton fondo="acento" variante="secundario">
            Secundario
          </Boton>
          <Boton fondo="acento" variante="fantasma">
            Fantasma
          </Boton>
          <Boton fondo="acento" disabled>
            Deshabilitado
          </Boton>
        </div>
      </Seccion>

      {/* --- Badges ------------------------------------------------------- */}
      <Seccion tituloId="titulo-badges">
        <SeccionTitulo id="titulo-badges" bajada="Insignias de estado. Los tonos exito y aviso usan los colores funcionales.">
          Badges
        </SeccionTitulo>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Badge>Neutro</Badge>
          <Badge tono="acento">Destacada</Badge>
          <Badge tono="exito">Pagado</Badge>
          <Badge tono="aviso">Pendiente</Badge>
          <Badge tono="oscuro">Publicado</Badge>
        </div>
      </Seccion>

      {/* --- Cards -------------------------------------------------------- */}
      <Seccion tono="claro" tituloId="titulo-cards">
        <SeccionTitulo id="titulo-cards" bajada="Card estática, CardEnlace (es un <a>) y superficie oscura.">
          Cards
        </SeccionTitulo>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardCuerpo>
              <Badge tono="acento" className="mb-3">
                Nivel 1
              </Badge>
              <CardTitulo>Iniciación</CardTitulo>
              <p className="mt-2 text-texto-sec">[Descripción del nivel]. Edades [x–y] años.</p>
            </CardCuerpo>
          </Card>

          <CardEnlace href="/competencias" etiquetaAccesible="Ver todas las competencias">
            <CardCuerpo>
              <CardTitulo>Competencias</CardTitulo>
              <p className="mt-2 text-texto-sec">Calendario y resultados. Toda la tarjeta es el enlace.</p>
              <span className="mt-4 inline-block font-semibold text-rojo">Ver resultados →</span>
            </CardCuerpo>
          </CardEnlace>

          <Card oscura>
            <CardCuerpo>
              <CardTitulo>Superficie oscura</CardTitulo>
              <p className="mt-2 text-blanco/85">Azul medio sobre azul profundo. Texto blanco: 14.5:1.</p>
            </CardCuerpo>
          </Card>
        </div>
      </Seccion>

      {/* --- Tabs y filtros ---------------------------------------------- */}
      <Seccion tituloId="titulo-tabs">
        <SeccionTitulo id="titulo-tabs" bajada="tablist con foco itinerante; la barra roja se desliza con layoutId.">
          Tabs y filtros
        </SeccionTitulo>
        <div className="mt-8 flex flex-col gap-10">
          <DemoTabs />
          <div>
            <p className="mb-3 text-sm font-semibold text-texto-sec">
              Contenido largo · cinco pestañas con etiquetas largas, scroll horizontal en móvil
            </p>
            <DemoTabsLargas />
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold text-texto-sec">Filtros · aria-pressed, sin paneles</p>
            <DemoFiltros />
          </div>
        </div>
      </Seccion>

      {/* --- Acordeón ----------------------------------------------------- */}
      <Seccion tono="claro" tituloId="titulo-acordeon">
        <SeccionTitulo id="titulo-acordeon" bajada="Uno abierto a la vez. <button> con aria-expanded y aria-controls.">
          Acordeón
        </SeccionTitulo>
        <Acordeon className="mt-8 max-w-3xl" items={PREGUNTAS} abiertosInicial={["edad"]} />
      </Seccion>

      {/* --- Formularios -------------------------------------------------- */}
      <Seccion tituloId="titulo-formularios">
        <SeccionTitulo
          id="titulo-formularios"
          bajada="Inputs a 16px, type e inputMode correctos, autoComplete, una columna en móvil."
        >
          Formularios
        </SeccionTitulo>
        <form className="mt-8 flex max-w-lg flex-col gap-5">
          <Campo etiqueta="Nombre completo" name="nombre" autoComplete="name" required placeholder="Como aparece en el documento" />
          <Campo
            etiqueta="Correo electrónico"
            name="correo"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            ayuda="Enviaremos el comprobante a este correo."
          />
          <Campo
            etiqueta="Teléfono"
            name="telefono"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            defaultValue="300 123"
            error="Escribe un número de diez dígitos."
          />
          <Select
            etiqueta="Talla"
            name="talla"
            marcador="Selecciona una talla"
            defaultValue=""
            opciones={[
              { valor: "s", etiqueta: "S" },
              { valor: "m", etiqueta: "M" },
              { valor: "l", etiqueta: "L — agotada", deshabilitada: true },
              { valor: "xl", etiqueta: "XL" },
            ]}
          />
          <AreaTexto etiqueta="Notas del pedido" name="notas" ayuda="Opcional." />
          <DemoStepper />
          <Campo etiqueta="Campo deshabilitado" name="deshabilitado" disabled defaultValue="No editable" />
        </form>
      </Seccion>

      {/* --- Skeleton ----------------------------------------------------- */}
      <Seccion tono="claro" tituloId="titulo-skeleton">
        <SeccionTitulo id="titulo-skeleton" bajada="Estados de carga para Suspense. aria-hidden; el pulso se apaga con movimiento reducido.">
          Skeleton
        </SeccionTitulo>
        <div className="mt-8 overflow-hidden rounded-lg border border-gris-borde">
          <SkeletonHero />
        </div>
        <p className="mt-3 text-sm text-texto-sec">
          SkeletonHero (claro u oscuro) y SkeletonFilas: los usan los loading.tsx de cada ruta.
        </p>
        <SkeletonFilas filas={2} className="mt-6" />
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <SkeletonTarjeta />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-1/2" />
            <SkeletonTexto lineas={4} />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-2/3" />
          </div>
        </div>
      </Seccion>

      {/* --- Modal -------------------------------------------------------- */}
      <Seccion tituloId="titulo-modal">
        <SeccionTitulo id="titulo-modal" bajada="role=dialog, foco atrapado, Escape y clic fuera cierran, el fondo no hace scroll.">
          Modal
        </SeccionTitulo>
        <div className="mt-8">
          <DemoModal />
        </div>
      </Seccion>

      {/* =================================================================
          Primitivos de las vistas interiores (bloque A)
          ================================================================= */}

      {/* --- HeroPagina --------------------------------------------------- */}
      <Seccion tono="claro" tituloId="titulo-heropagina" espaciado="compacto">
        <SeccionTitulo
          id="titulo-heropagina"
          bajada="Cabecera de página interior. Lleva el único h1. Oscuro para matrículas y carrito; claro para el resto. El lateral recibe un filtro o un CTA."
        >
          HeroPagina
        </SeccionTitulo>
      </Seccion>
      <div className="flex flex-col gap-px">
        <HeroPagina
          tono="oscuro"
          antetitulo="Matrículas"
          titulo="Documentos de matrícula"
          bajada="Descarga los formatos, diligéncialos y entrégalos en la sede. La radicación es presencial."
        />
        <HeroPagina
          antetitulo="Resultados"
          titulo="Competencias con un título deliberadamente largo para ver cómo parte"
          bajada="Bajada larga: calendario y resultados de nuestros riders, válida por válida, con filtros por año y por categoría para encontrar una fecha concreta."
          lateral={<DemoFiltros />}
        />
      </div>

      {/* --- SelectorDetalle --------------------------------------------- */}
      <Seccion tituloId="titulo-selectordetalle">
        <SeccionTitulo
          id="titulo-selectordetalle"
          bajada="Lista y panel desde lg; acordeón por debajo. Para procesos por pasos o fichas que cambian al elegir. Flechas ↑↓, Inicio y Fin en la lista."
        >
          SelectorDetalle
        </SeccionTitulo>
        <SelectorDetalle className="mt-8" etiqueta="Pasos de ejemplo" items={PASOS_EJEMPLO} />
      </Seccion>

      {/* --- ItemDescarga ------------------------------------------------- */}
      <Seccion tono="claro" tituloId="titulo-itemdescarga">
        <SeccionTitulo
          id="titulo-itemdescarga"
          bajada="Fila de archivo con datos y botón <a download>. Sin href, avisa que el archivo está pendiente en vez de mostrar un botón roto."
        >
          ItemDescarga
        </SeccionTitulo>
        <div className="mt-8 flex flex-col gap-4">
          <ItemDescarga
            titulo="Ficha de inscripción"
            descripcion="Datos del deportista y del acudiente."
            meta={["Versión 3", "Publicado el 1 de enero de 2026", "240 KB"]}
            href="/documentos/[archivo].pdf"
            nombreArchivo="ficha-inscripcion.pdf"
          />
          <ItemDescarga
            titulo="Título largo: reglamento interno de convivencia, uso de la pista y responsabilidades de acudientes y deportistas"
            descripcion="Descripción también larga para comprobar que el botón no se aplasta ni se sale de la tarjeta a 360px, y que el texto parte en varias líneas sin desbordar."
            meta={["Versión 12", "Publicado el 30 de diciembre de 2025", "1,8 MB"]}
            href="/documentos/[archivo].pdf"
          />
          <ItemDescarga titulo="Autorización médica" meta={[]} />
        </div>
      </Seccion>

      {/* --- TablaResponsiva --------------------------------------------- */}
      <Seccion tituloId="titulo-tabla">
        <SeccionTitulo
          id="titulo-tabla"
          bajada="Tabla desde md; por debajo, tarjetas apiladas con la columna principal como título. Para historiales y resúmenes de cuatro o más columnas."
        >
          TablaResponsiva
        </SeccionTitulo>
        <TablaResponsiva
          className="mt-8"
          caption="Historial de ejemplo"
          columnas={COLUMNAS_EJEMPLO}
          filas={FILAS_EJEMPLO}
          claveFila={(f) => f.id}
        />
      </Seccion>

      {/* --- EstadoVacio y EstadoError ----------------------------------- */}
      <Seccion tono="claro" tituloId="titulo-vacio">
        <SeccionTitulo
          id="titulo-vacio"
          bajada="EstadoVacio en toda vista que consulte y no reciba filas; EstadoError es el cuerpo de los error.tsx."
        >
          EstadoVacio y EstadoError
        </SeccionTitulo>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <EstadoVacio
            titulo="Todavía no hay documentos publicados"
            texto="Los formatos de matrícula aparecerán aquí en cuanto el club los publique."
          />
          <EstadoVacio
            titulo="Tu carrito está vacío"
            texto="Cuando agregues productos aparecerán aquí."
            accion={<Boton href="/tienda">Ir a la tienda</Boton>}
          />
        </div>
        <div className="mt-6 rounded-lg bg-azul-profundo p-6">
          <EstadoVacio oscuro titulo="Sin resultados en 2026" texto="Variante sobre fondo oscuro." />
        </div>
        <div className="mt-6 rounded-lg border border-gris-borde bg-blanco">
          <DemoEstadoError />
        </div>
      </Seccion>

      {/* =================================================================
          Primitivos del panel de administración (fase 3)
          ================================================================= */}

      <Seccion tono="claro" tituloId="titulo-indicador">
        <SeccionTitulo
          id="titulo-indicador"
          bajada="Cifra clave del inicio del panel. Con valor null muestra un guion y el detalle explica por qué; con href, toda la tarjeta enlaza."
        >
          Indicador
        </SeccionTitulo>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <li>
            <Indicador etiqueta="Pedidos pendientes" valor={3} detalle="Esperando pago en Wompi." href="/admin/pedidos" />
          </li>
          <li>
            <Indicador etiqueta="Pedidos pagados" valor={128} detalle="Con pago confirmado." />
          </li>
          <li>
            <Indicador etiqueta="Descargas del mes" valor={null} detalle="Sin registro todavía: el esquema no guarda descargas." />
          </li>
          <li>
            <Indicador
              etiqueta="Etiqueta larga para comprobar el corte de línea del indicador"
              valor="1.240"
              detalle="Detalle también largo que ocupa dos o tres líneas sin romper la tarjeta ni desalinear la cuadrícula."
            />
          </li>
        </ul>
      </Seccion>

      <Seccion tituloId="titulo-chipestado">
        <SeccionTitulo
          id="titulo-chipestado"
          bajada="Estado de un registro. Las tres máquinas de estado del sistema viven aquí: un mismo valor se ve igual en tablas, detalles y bitácora."
        >
          ChipEstado
        </SeccionTitulo>
        <div className="mt-8 flex flex-col gap-4">
          <p className="text-sm font-semibold text-texto-sec">Pedido</p>
          <div className="flex flex-wrap gap-2">
            <ChipEstado tipo="pedido" valor="pendiente" />
            <ChipEstado tipo="pedido" valor="pagado" />
            <ChipEstado tipo="pedido" valor="preparando" />
            <ChipEstado tipo="pedido" valor="entregado" />
            <ChipEstado tipo="pedido" valor="rechazado" />
            <ChipEstado tipo="pedido" valor="expirado" />
            <ChipEstado tipo="pedido" valor="cancelado" />
          </div>
          <p className="text-sm font-semibold text-texto-sec">Publicación</p>
          <div className="flex flex-wrap gap-2">
            <ChipEstado tipo="publicacion" valor="borrador" />
            <ChipEstado tipo="publicacion" valor="publicado" />
            <ChipEstado tipo="publicacion" valor="archivado" />
          </div>
          <p className="text-sm font-semibold text-texto-sec">Activo</p>
          <div className="flex flex-wrap gap-2">
            <ChipEstado tipo="activo" valor={true} />
            <ChipEstado tipo="activo" valor={false} />
          </div>
        </div>
      </Seccion>

      <Seccion tono="claro" tituloId="titulo-aviso">
        <SeccionTitulo
          id="titulo-aviso"
          bajada="Mensaje en línea de formularios y acciones. El tono error usa role=alert; los demás, status."
        >
          Aviso
        </SeccionTitulo>
        <div className="mt-8 flex max-w-xl flex-col gap-3">
          <Aviso tono="error">Credenciales incorrectas.</Aviso>
          <Aviso tono="exito" titulo="Cambios guardados">
            El producto ya aparece en la tienda.
          </Aviso>
          <Aviso tono="aviso" titulo="El inventario no se repone">
            Al cancelar un pedido en preparación, la prenda ya lleva estampado personalizado y no
            vuelve al inventario. Texto largo a propósito para ver cómo parte en varias líneas.
          </Aviso>
          <Aviso tono="info">Si el correo corresponde a la cuenta del administrador, recibirás un enlace.</Aviso>
        </div>
      </Seccion>

      <Seccion tono="claro" tituloId="titulo-archivo">
        <SeccionTitulo
          id="titulo-archivo"
          bajada="Subida del panel. Valida el MIME real por firma de bytes, no la extensión, y el tamaño, antes de salir del navegador."
        >
          Archivo
        </SeccionTitulo>
        <div className="mt-8 max-w-xl">
          <DemoArchivo />
        </div>
      </Seccion>

      <Seccion tono="claro" tituloId="titulo-campomoneda">
        <SeccionTitulo
          id="titulo-campomoneda"
          bajada="Precio del panel: se captura en pesos y entrega centavos. La conversión vive en formato.ts; este campo es su única puerta en la interfaz."
        >
          CampoMoneda
        </SeccionTitulo>
        <div className="mt-8 max-w-md">
          <DemoCampoMoneda />
        </div>
      </Seccion>

      <Seccion tituloId="titulo-piemodal">
        <SeccionTitulo
          id="titulo-piemodal"
          bajada="Pie estándar de los modales del panel: cancelar y acción principal, con estado de carga que deshabilita ambos."
        >
          PieModal
        </SeccionTitulo>
        <div className="mt-8">
          <DemoPieModal />
        </div>
      </Seccion>

      <Seccion tituloId="titulo-boton-cargando">
        <SeccionTitulo
          id="titulo-boton-cargando"
          bajada="Boton con cargando: se deshabilita, anuncia aria-busy y muestra un giro. Evita el doble clic que crea dos registros."
        >
          Botón cargando
        </SeccionTitulo>
        <div className="mt-8">
          <DemoBotonCargando />
        </div>
      </Seccion>

      {/* --- BloqueCTA ---------------------------------------------------- */}
      <Seccion tituloId="titulo-bloquecta" espaciado="compacto">
        <SeccionTitulo
          id="titulo-bloquecta"
          bajada="Franja de cierre. Rojo por defecto (único fondo rojo del sitio), oscuro como alternativa. Los botones llevan fondo acorde."
        >
          BloqueCTA
        </SeccionTitulo>
      </Seccion>
      <BloqueCTA
        tituloId="titulo-cta-ejemplo"
        titulo="¿Dudas con la matrícula?"
        texto="Escríbenos y te contamos qué documentos necesitas y cuándo puedes radicarlos."
        acciones={
          <>
            <Boton href="/matriculas" fondo="acento" tamano="lg">
              Escribir por WhatsApp
            </Boton>
            <Boton href="/matriculas" fondo="acento" variante="secundario" tamano="lg">
              Ver documentos
            </Boton>
          </>
        }
      />
      <BloqueCTA
        tono="oscuro"
        tituloId="titulo-cta-ejemplo-oscuro"
        titulo="Variante oscura con un título bastante más largo de lo habitual"
        acciones={
          <Boton href="/semilleros" fondo="oscuro" tamano="lg">
            Conocer los semilleros
          </Boton>
        }
      />
    </>
  );
}

const PASOS_EJEMPLO = [
  {
    id: "uno",
    numero: "01",
    titulo: "Descarga los documentos",
    resumen: "Desde esta misma página",
    contenido: <p className="text-texto-sec">Baja los formatos vigentes. Cada archivo indica versión y fecha.</p>,
  },
  {
    id: "dos",
    numero: "02",
    titulo: "Diligencia e imprime con un título largo que parte en dos líneas",
    resumen: "Datos del deportista y del acudiente",
    contenido: (
      <p className="text-texto-sec">
        Contenido largo: completa cada formato con los datos del deportista y de la persona
        responsable, imprímelos y revisa que ninguna casilla obligatoria quede vacía. Si un dato no
        aplica, escribe &quot;no aplica&quot; en vez de dejarlo en blanco, porque los formatos
        incompletos se devuelven en la radicación.
      </p>
    ),
  },
  {
    id: "tres",
    numero: "03",
    titulo: "Radica en la sede",
    contenido: <p className="text-texto-sec">Entrega la carpeta completa. La radicación es presencial.</p>,
  },
];

type FilaEjemplo = { id: string; fecha: string; competencia: string; rider: string; resultado: string };

const COLUMNAS_EJEMPLO: ColumnaTabla<FilaEjemplo>[] = [
  { clave: "fecha", titulo: "Fecha", render: (f) => f.fecha, className: "whitespace-nowrap" },
  { clave: "competencia", titulo: "Competencia", principal: true, render: (f) => f.competencia },
  { clave: "rider", titulo: "Rider", render: (f) => f.rider },
  {
    clave: "resultado",
    titulo: "Resultado",
    render: (f) => <span className="font-display text-lg text-rojo">{f.resultado}</span>,
  },
];

const FILAS_EJEMPLO: FilaEjemplo[] = [
  { id: "1", fecha: "1 de enero de 2026", competencia: "[Competencia 1 — título pendiente]", rider: "[Rider 1]", resultado: "1.º" },
  {
    id: "2",
    fecha: "1 de febrero de 2026",
    competencia: "[Competencia con un título muy largo, válida nacional de BMX categoría infantil y juvenil — pendiente]",
    rider: "[Rider con nombre y dos apellidos largos]",
    resultado: "12.º",
  },
  { id: "3", fecha: "1 de marzo de 2026", competencia: "[Competencia 3 — título pendiente]", rider: "—", resultado: "Pendiente" },
];

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-texto-sec">{titulo}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

const COLORES = [
  { nombre: "azul-profundo", hex: "#0B1B33", clase: "bg-azul-profundo", uso: "Fondo oscuro, header, footer" },
  { nombre: "azul-medio", hex: "#12294D", clase: "bg-azul-medio", uso: "Superficies sobre azul profundo" },
  { nombre: "rojo", hex: "#D7263D", clase: "bg-rojo", uso: "Acento único: CTAs, activos" },
  { nombre: "rojo-oscuro", hex: "#A31128", clase: "bg-rojo-oscuro", uso: "Hover del acento" },
  { nombre: "blanco", hex: "#FFFFFF", clase: "bg-blanco", uso: "Fondo base" },
  { nombre: "gris-frio", hex: "#F2F4F7", clase: "bg-gris-frio", uso: "Secciones claras" },
  { nombre: "gris-borde", hex: "#DCE3EC", clase: "bg-gris-borde", uso: "Bordes y separadores" },
  { nombre: "texto-sec", hex: "#46566F", clase: "bg-texto-sec", uso: "Texto secundario" },
];

const PREGUNTAS = [
  {
    id: "edad",
    titulo: "¿Desde qué edad se puede ingresar?",
    contenido: <p>[Edad mínima de ingreso]. El nivel de iniciación recibe deportistas sin experiencia previa.</p>,
  },
  {
    id: "bici",
    titulo: "¿Hay que tener bicicleta propia?",
    contenido: <p>[Política del club sobre bicicletas y protección].</p>,
  },
  {
    id: "horario",
    titulo: "¿Cuáles son los horarios de entrenamiento?",
    contenido: <p>[Horarios por nivel]. Cada semillero tiene su franja; consulta la ficha del nivel.</p>,
  },
];
