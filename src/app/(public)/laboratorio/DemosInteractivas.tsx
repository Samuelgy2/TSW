"use client";

import { useState } from "react";

import { Aviso, Archivo, Boton, CampoMoneda, EstadoError, Filtros, Modal, PieModal, Stepper, Tabs } from "@/components/ui";

/** Pestañas con panel: navegación con flechas, Inicio y Fin. */
export function DemoTabs() {
  const [anio, setAnio] = useState("2025");
  const opciones = [
    { valor: "2025", etiqueta: "2025" },
    { valor: "2024", etiqueta: "2024" },
    { valor: "2023", etiqueta: "2023" },
  ];

  return (
    <Tabs opciones={opciones} valor={anio} alCambiar={setAnio} etiqueta="Año de competencia">
      <p className="text-texto-sec">
        Panel de <strong className="text-azul-profundo">{anio}</strong>. Con el foco en una
        pestaña, las flechas izquierda y derecha cambian de año.
      </p>
    </Tabs>
  );
}

/** Píldoras de filtro: botones de alternancia con `aria-pressed`. */
export function DemoFiltros() {
  const [categoria, setCategoria] = useState("todos");
  const opciones = [
    { valor: "todos", etiqueta: "Todos" },
    { valor: "uniformes", etiqueta: "Uniformes" },
    { valor: "proteccion", etiqueta: "Protección" },
    { valor: "merch", etiqueta: "Merchandising" },
  ];

  return <Filtros opciones={opciones} valor={categoria} alCambiar={setCategoria} etiqueta="Categoría" />;
}

/** Cantidad con rango acotado y ayuda contextual. */
export function DemoStepper() {
  const [cantidad, setCantidad] = useState(1);
  const disponibles = 5;

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10">
      <Stepper
        etiqueta="Cantidad"
        valor={cantidad}
        alCambiar={setCantidad}
        min={1}
        max={disponibles}
        ayuda={`Quedan ${disponibles} unidades`}
      />
      <Stepper etiqueta="Agotado" valor={0} alCambiar={() => undefined} min={0} max={0} disabled />
    </div>
  );
}

/** Diálogo modal con foco atrapado. */
export function DemoModal() {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <Boton variante="secundario" onClick={() => setAbierto(true)}>
        Abrir diálogo
      </Boton>

      <Modal
        abierto={abierto}
        alCerrar={() => setAbierto(false)}
        titulo="¿Vaciar el carrito?"
        pie={
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Boton variante="fantasma" onClick={() => setAbierto(false)}>
              Cancelar
            </Boton>
            <Boton onClick={() => setAbierto(false)}>Vaciar carrito</Boton>
          </div>
        }
      >
        <p className="text-texto-sec">
          Se quitarán todos los artículos. Esta acción no se puede deshacer. Prueba Tab, Shift+Tab
          y Escape: el foco no sale del diálogo y al cerrarlo vuelve al botón.
        </p>
      </Modal>
    </>
  );
}

/** Muchas pestañas con etiquetas largas: en móvil se desplazan en horizontal. */
export function DemoTabsLargas() {
  const opciones = [
    { valor: "semillero", etiqueta: "[Semillero — nombre pendiente]" },
    { valor: "formativo-1", etiqueta: "[Nivel formativo 1 — nombre pendiente]" },
    { valor: "formativo-2", etiqueta: "[Nivel formativo 2 — nombre pendiente]" },
    { valor: "competitivo", etiqueta: "[Nivel competitivo — nombre pendiente]" },
    { valor: "elite", etiqueta: "[Nivel élite — nombre pendiente]" },
  ];
  const [valor, setValor] = useState(opciones[2]?.valor ?? "");

  return (
    <Tabs opciones={opciones} valor={valor} alCambiar={setValor} etiqueta="Niveles (contenido largo)">
      <p className="text-texto-sec">
        Con cinco etiquetas largas a 360px la lista no se apila: se desplaza. La pestaña activa se
        trae a la vista sola al cambiar con flechas.
      </p>
    </Tabs>
  );
}

/** Cuerpo de los error.tsx, con un reset que no hace nada. */
export function DemoEstadoError() {
  return (
    <EstadoError
      error={new Error("Error de muestra para el laboratorio")}
      reset={() => undefined}
      contexto="los documentos de matrícula"
    />
  );
}

/** Subida con validación de MIME real por firma y de tamaño. */
export function DemoArchivo() {
  const [elegido, setElegido] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <Archivo
        etiqueta="PDF de prueba"
        mimesPermitidos={["application/pdf"]}
        descripcionTipos="Solo PDF"
        maximoBytes={10 * 1024 * 1024}
        ayuda="Prueba a renombrar una imagen a .pdf: el contenido manda, no la extensión."
        alSeleccionar={(archivo) => setElegido(archivo?.name ?? null)}
      />
      {elegido && (
        <Aviso tono="exito">Validado en el cliente: {elegido}. El servidor lo vuelve a validar.</Aviso>
      )}
    </div>
  );
}

/** Precio en pesos que entrega centavos: la frontera de conversión. */
export function DemoCampoMoneda() {
  const [centavos, setCentavos] = useState(4_500_000);

  return (
    <div className="flex flex-col gap-3">
      <CampoMoneda
        etiqueta="Precio de la variante"
        valorCentavos={centavos}
        alCambiar={setCentavos}
        ayuda="Escríbelo en pesos; hacia la base sale en centavos. Formatea con miles al salir del campo."
      />
      <p className="text-sm text-texto-sec">
        Valor entregado al servidor: <span className="font-mono font-semibold text-azul-profundo">{centavos}</span> centavos
        = {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(centavos / 100)}
      </p>
    </div>
  );
}

/** Pie estándar de los modales del panel, con estado de carga. */
export function DemoPieModal() {
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  function guardar() {
    setGuardando(true);
    window.setTimeout(() => {
      setGuardando(false);
      setAbierto(false);
    }, 1200);
  }

  return (
    <>
      <Boton variante="secundario" onClick={() => setAbierto(true)}>
        Modal con pie estándar
      </Boton>
      <Modal abierto={abierto} alCerrar={() => setAbierto(false)} titulo="PieModal">
        <p className="text-texto-sec">
          Cancelar y guardar con estado de carga: el mismo pie de todos los modales del panel, sin
          repetirlo a mano en cada módulo.
        </p>
        <PieModal alCerrar={() => setAbierto(false)} cargando={guardando} onGuardar={guardar} etiquetaGuardar="Guardar cambios" />
      </Modal>
    </>
  );
}

/** Botón con estado de carga: deshabilitado, aria-busy y un giro. */
export function DemoBotonCargando() {
  const [cargando, setCargando] = useState(false);

  function simular() {
    setCargando(true);
    window.setTimeout(() => setCargando(false), 1800);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Boton cargando={cargando} onClick={simular}>
        Guardar cambios
      </Boton>
      <Boton cargando variante="secundario">
        Publicando…
      </Boton>
      <Boton cargando fondo="oscuro" className="bg-azul-profundo">
        Sobre oscuro
      </Boton>
    </div>
  );
}
