"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Aviso,
  AreaTexto,
  Archivo,
  Boton,
  Campo,
  CampoMoneda,
  ChipEstado,
  Modal,
  PieModal,
  Select,
  TablaResponsiva,
  type ColumnaTabla,
} from "@/components/ui";
import { urlPublicaStorage } from "@/lib/supabase/storage";
import { aSlug } from "@/lib/utils";
import { MAXIMO_IMAGEN_BYTES, MIMES_IMAGEN } from "../constantes";
import { disponible, type ProductoConVariantes } from "@/features/tienda/types";
import {
  alternarProducto,
  alternarVariante,
  guardarProducto,
  guardarVariante,
  subirImagenProducto,
} from "../acciones-productos";

type ResultadoAccion = { ok: boolean; error?: string; mensaje?: string };
type VariantesBorrador = {
  id?: string;
  talla: string;
  precioCentavos: number;
  stock: number;
  sku: string;
  activo: boolean;
};

const CATEGORIAS = [
  { valor: "uniformes", etiqueta: "Uniformes" },
  { valor: "proteccion", etiqueta: "Protección" },
  { valor: "merchandising", etiqueta: "Merchandising" },
] as const;

function etiquetaCategoria(categoria: string): string {
  return CATEGORIAS.find((c) => c.valor === categoria)?.etiqueta ?? categoria;
}

/**
 * Módulo de productos. Reglas que la interfaz hace cumplir:
 *  · El precio se captura en pesos (CampoMoneda) y se envía en centavos: la
 *    conversión vive en formato.ts, no aquí.
 *  · Stock y stock reservado se muestran por separado: son cosas distintas y
 *    confundirlas lleva a sobreventa. El reservado no se edita jamás: lo
 *    mueven los pedidos.
 *  · No hay eliminar: un producto con pedidos no se puede borrar (FK
 *    RESTRICT). Se desactiva, y si la base rechazara algo, el mensaje que
 *    llega ya está traducido a lenguaje del cliente.
 */
export function ProductosAdmin({ productos }: { productos: ProductoConVariantes[] }) {
  const router = useRouter();
  const [aviso, setAviso] = useState<ResultadoAccion | null>(null);
  const [editando, setEditando] = useState<ProductoConVariantes | "nuevo" | null>(null);
  const [confirmarDesactivar, setConfirmarDesactivar] = useState<ProductoConVariantes | null>(null);

  function ejecutar(accion: () => Promise<ResultadoAccion>) {
    setAviso(null);
    void accion().then((resultado) => {
      setAviso(resultado);
      if (resultado.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {aviso?.error && <Aviso tono="error">{aviso.error}</Aviso>}
      {aviso?.ok && aviso.mensaje && <Aviso tono="exito" titulo="Listo">{aviso.mensaje}</Aviso>}

      <div className="flex justify-end">
        <Boton onClick={() => setEditando("nuevo")}>Nuevo producto</Boton>
      </div>

      <TablaResponsiva
        caption="Productos del catálogo"
        filas={productos}
        claveFila={(p) => p.id}
        columnas={[
          {
            clave: "nombre",
            titulo: "Producto",
            principal: true,
            render: (p) => (
              <span className="block max-w-[24rem] lg:max-w-none">
                {p.nombre}
                <span className="mt-1 block text-sm font-normal text-texto-sec">/{p.slug}</span>
              </span>
            ),
          },
          { clave: "categoria", titulo: "Categoría", render: (p) => etiquetaCategoria(p.categoria) },
          { clave: "estado", titulo: "Estado", render: (p) => <ChipEstado tipo="activo" valor={p.activo} /> },
          {
            clave: "variantes",
            titulo: "Variantes",
            render: (p) => {
              const conStock = p.variantes.filter((v) => v.activo && disponible(v) > 0).length;
              return (
                <span className="whitespace-nowrap">
                  {p.variantes.length} ({conStock} con stock)
                </span>
              );
            },
          },
          {
            clave: "acciones",
            titulo: "Acciones",
            alinear: "derecha",
            render: (p) => (
              <div className="flex flex-wrap justify-end gap-2">
                <Boton tamano="sm" variante="secundario" onClick={() => setEditando(p)}>
                  Editar
                </Boton>
                <Boton
                  tamano="sm"
                  variante="fantasma"
                  onClick={() =>
                    p.activo
                      ? setConfirmarDesactivar(p)
                      : ejecutar(() => alternarProducto(p.id, true))
                  }
                >
                  {p.activo ? "Desactivar" : "Activar"}
                </Boton>
              </div>
            ),
          },
        ] satisfies ColumnaTabla<ProductoConVariantes>[]}
      />

      {productos.length === 0 && (
        <p className="rounded-lg border-2 border-dashed border-gris-borde bg-blanco px-6 py-10 text-center text-texto-sec">
          Todavía no hay productos. Crea el primero: aparecerá en la tienda.
        </p>
      )}

      <ModalProducto
        producto={editando}
        alCerrar={() => setEditando(null)}
        onGuardado={(resultado) => {
          setAviso(resultado);
          if (resultado.ok) router.refresh();
        }}
      />

      {/* Desactivar es reversible, pero saca el producto del sitio: se
          confirma para que no pase por un clic distraído. */}
      <Modal
        abierto={confirmarDesactivar !== null}
        alCerrar={() => setConfirmarDesactivar(null)}
        titulo="¿Desactivar este producto?"
        pie={
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Boton variante="fantasma" onClick={() => setConfirmarDesactivar(null)}>
              Cancelar
            </Boton>
            <Boton
              onClick={() => {
                const p = confirmarDesactivar;
                setConfirmarDesactivar(null);
                if (p) ejecutar(() => alternarProducto(p.id, false));
              }}
            >
              Desactivar
            </Boton>
          </div>
        }
      >
        <p className="text-texto-sec">
          Deja de verse en la tienda de inmediato, pero conserva su historial de pedidos y se puede
          reactivar cuando quieras. <strong className="text-azul-profundo">No se puede eliminar:</strong>{" "}
          los pedidos pasados lo referencian.
        </p>
      </Modal>
    </div>
  );
}

// --- Editor -----------------------------------------------------------------

function ModalProducto({
  producto,
  alCerrar,
  onGuardado,
}: {
  producto: ProductoConVariantes | "nuevo" | null;
  alCerrar: () => void;
  onGuardado: (resultado: ResultadoAccion) => void;
}) {
  const esNuevo = producto === "nuevo";
  const existente = producto && producto !== "nuevo" ? producto : null;

  const [nombre, setNombre] = useState(existente?.nombre ?? "");
  const [slug, setSlug] = useState(existente?.slug ?? "");
  const [slugEditado, setSlugEditado] = useState(Boolean(existente));
  const [categoria, setCategoria] = useState(existente?.categoria ?? "uniformes");
  const [descripcion, setDescripcion] = useState(existente?.descripcion ?? "");
  const [activo, setActivo] = useState(existente?.activo ?? true);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Variantes en línea: se editan juntas y se guardan una por una.
  const [variantes, setVariantes] = useState<VariantesBorrador[]>(
    existente
      ? existente.variantes.map((v) => ({
          id: v.id,
          talla: v.talla,
          precioCentavos: v.precio_centavos,
          stock: v.stock,
          sku: v.sku ?? "",
          activo: v.activo,
        }))
      : [],
  );
  const [resultadoVariante, setResultadoVariante] = useState<ResultadoAccion | null>(null);
  const [varianteEnCurso, setVarianteEnCurso] = useState<string | null>(null);

  // Foto: la subida exige un producto guardado (la ruta lleva su id).
  const [imagenPath, setImagenPath] = useState<string | null>(existente?.imagen_path ?? null);
  const [mensajeImagen, setMensajeImagen] = useState<ResultadoAccion | null>(null);
  const [subiendoImagen, setSubiendoImagen] = useState(false);

  const router = useRouter();

  function alEscribirNombre(valor: string) {
    setNombre(valor);
    if (!slugEditado) setSlug(aSlug(valor));
  }

  function alEscribirSlug(valor: string) {
    setSlugEditado(true);
    setSlug(valor);
  }

  async function guardar() {
    setError(null);
    if (nombre.trim().length < 3) return setError("El nombre es obligatorio.");
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return setError("Slug inválido: solo minúsculas, números y guiones.");

    setCargando(true);
    const resultado = await guardarProducto({
      id: existente?.id,
      nombre: nombre.trim(),
      slug,
      categoria,
      descripcion: descripcion.trim() || undefined,
      activo,
      orden: existente?.orden ?? 0,
    });
    setCargando(false);
    onGuardado(resultado);
    if (resultado.ok) alCerrar();
    else setError(resultado.error ?? "No se pudo guardar.");
  }

  function editarVariante(indice: number, cambio: Partial<VariantesBorrador>) {
    setVariantes((previas) =>
      previas.map((v, i) => (i === indice ? { ...v, ...cambio } : v)),
    );
  }

  async function guardarVarianteEn(indice: number) {
    const borrador = variantes[indice];
    if (!borrador || !existente) return;
    if (!borrador.talla.trim()) {
      setResultadoVariante({ ok: false, error: "La talla es obligatoria." });
      return;
    }
    if (borrador.precioCentavos <= 0) {
      setResultadoVariante({ ok: false, error: "El precio debe ser mayor que cero." });
      return;
    }

    setVarianteEnCurso(borrador.id ?? `nueva-${indice}`);
    setResultadoVariante(null);
    const resultado = await guardarVariante(
      {
        id: borrador.id,
        talla: borrador.talla.trim(),
        precioCentavos: borrador.precioCentavos,
        stock: borrador.stock,
        sku: borrador.sku.trim() || undefined,
        activo: borrador.activo,
      },
      existente.id,
    );
    setVarianteEnCurso(null);
    setResultadoVariante(resultado);
    if (resultado.ok) router.refresh();
  }

  async function subirImagen(archivo: File | null) {
    if (!archivo || !existente) return;
    setMensajeImagen(null);
    setSubiendoImagen(true);
    const resultado = await subirImagenProducto(existente.id, archivo);
    setSubiendoImagen(false);
    setMensajeImagen(resultado);
    if (resultado.ok) {
      setImagenPath(resultado.imagenPath ?? imagenPath);
      router.refresh();
    }
  }

  return (
    <Modal
      abierto={producto !== null}
      alCerrar={alCerrar}
      titulo={esNuevo ? "Nuevo producto" : `Editar — ${existente?.nombre ?? ""}`}
      className="sm:max-w-2xl"
    >
      <div className="flex flex-col gap-4">
        {error && <Aviso tono="error">{error}</Aviso>}
        <Campo
          etiqueta="Nombre"
          value={nombre}
          onChange={(e) => alEscribirNombre(e.target.value)}
          maxLength={160}
          required
        />
        <Campo
          etiqueta="Slug"
          value={slug}
          onChange={(e) => alEscribirSlug(e.target.value)}
          maxLength={160}
          ayuda="Identificador en la URL pública. Se autogenera del nombre; puedes editarlo."
          error={slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ? "Solo minúsculas, números y guiones." : undefined}
        />
        <Select
          etiqueta="Categoría"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as typeof categoria)}
          opciones={CATEGORIAS.map((c) => ({ valor: c.valor, etiqueta: c.etiqueta }))}
        />
        <AreaTexto
          etiqueta="Descripción"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          maxLength={2000}
          ayuda="Se muestra en la ficha pública del producto. Texto plano."
        />
        <label className="flex min-h-[44px] items-center gap-3 text-sm">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-5 w-5 accent-rojo" />
          Producto activo (visible en la tienda)
        </label>

        {/* Foto: exige el producto guardado, igual que las variantes. */}
        {existente ? (
          <div className="flex flex-col gap-2">
            {imagenPath && (
              <div className="relative h-32 w-32 overflow-hidden rounded-md border border-gris-borde bg-gris-frio">
                <Image
                  src={urlPublicaStorage("productos", imagenPath)}
                  alt={`Foto de ${existente.nombre}`}
                  fill
                  sizes="128px"
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            <Archivo
              etiqueta="Foto del producto"
              mimesPermitidos={MIMES_IMAGEN}
              descripcionTipos="JPEG, PNG, WebP o AVIF"
              maximoBytes={MAXIMO_IMAGEN_BYTES}
              ayuda="Se renombra a un identificador interno; el nombre original no llega al servidor de archivos."
              alSeleccionar={(a) => void subirImagen(a as File | null)}
              disabled={subiendoImagen}
            />
            {subiendoImagen && <p className="text-sm text-texto-sec">Subiendo imagen…</p>}
            {mensajeImagen?.error && <Aviso tono="error">{mensajeImagen.error}</Aviso>}
            {mensajeImagen?.ok && <Aviso tono="exito">{mensajeImagen.mensaje}</Aviso>}
          </div>
        ) : (
          <p className="text-sm text-texto-sec">
            Guarda el producto para habilitar la foto y las variantes.
          </p>
        )}

        {/* --- Variantes en línea -------------------------------------- */}
        {existente && (
          <section aria-labelledby="titulo-variantes" className="flex flex-col gap-3 border-t border-gris-borde pt-4">
            <div className="flex items-center justify-between gap-2">
              <h3 id="titulo-variantes" className="text-base">
                Variantes
              </h3>
              <Boton
                tamano="sm"
                variante="secundario"
                onClick={() =>
                  setVariantes((previas) => [
                    ...previas,
                    { talla: "", precioCentavos: 0, stock: 0, sku: "", activo: true },
                  ])
                }
              >
                Agregar talla
              </Boton>
            </div>

            <Aviso tono="info">
              El precio se escribe en pesos. “Stock” son las unidades en bodega; “Reservado” son las
              comprometidas por pedidos pendientes de pago y no se edita aquí: lo mueven los pedidos.
            </Aviso>

            {resultadoVariante?.error && <Aviso tono="error">{resultadoVariante.error}</Aviso>}
            {resultadoVariante?.ok && resultadoVariante.mensaje && (
              <Aviso tono="exito">{resultadoVariante.mensaje}</Aviso>
            )}

            <ul className="flex flex-col gap-3">
              {variantes.map((borrador, indice) => {
                const vigente = existente.variantes.find((v) => v.id === borrador.id);
                const enCurso = varianteEnCurso === (borrador.id ?? `nueva-${indice}`);
                return (
                  <li key={borrador.id ?? `nueva-${indice}`} className="rounded-md border border-gris-borde p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Campo
                        etiqueta="Talla"
                        value={borrador.talla}
                        onChange={(e) => editarVariante(indice, { talla: e.target.value })}
                        maxLength={20}
                        placeholder="S, M, L…"
                      />
                      <CampoMoneda
                        etiqueta="Precio"
                        valorCentavos={borrador.precioCentavos}
                        alCambiar={(centavos) => editarVariante(indice, { precioCentavos: centavos })}
                        required
                      />
                      <Campo
                        etiqueta="Stock en bodega"
                        type="number"
                        min={0}
                        value={borrador.stock}
                        onChange={(e) => editarVariante(indice, { stock: Math.max(0, Number(e.target.value) || 0) })}
                      />
                      <Campo
                        etiqueta="SKU (opcional)"
                        value={borrador.sku}
                        onChange={(e) => editarVariante(indice, { sku: e.target.value })}
                        maxLength={40}
                      />
                    </div>

                    {vigente && (
                      <p className="mt-2 text-sm text-texto-sec">
                        Reservado por pedidos: <strong className="text-azul-profundo">{vigente.stock_reservado}</strong>{" "}
                        · Disponible real:{" "}
                        <strong className="text-azul-profundo">{disponible(vigente)}</strong>
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <label className="flex min-h-[44px] items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={borrador.activo}
                          onChange={(e) => editarVariante(indice, { activo: e.target.checked })}
                          className="h-5 w-5 accent-rojo"
                        />
                        Activa
                      </label>
                      <div className="flex gap-2">
                        {borrador.id && (
                          <Boton
                            tamano="sm"
                            variante="fantasma"
                            cargando={enCurso}
                            onClick={() => void alternarVariante(borrador.id!, !borrador.activo).then((r) => {
                              setResultadoVariante(r);
                              if (r.ok) router.refresh();
                            })}
                          >
                            {borrador.activo ? "Desactivar" : "Activar"}
                          </Boton>
                        )}
                        <Boton tamano="sm" cargando={enCurso} onClick={() => void guardarVarianteEn(indice)}>
                          {borrador.id ? "Guardar variante" : "Agregar"}
                        </Boton>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {variantes.length === 0 && (
              <p className="text-sm text-texto-sec">
                Sin tallas todavía: agrega al menos una para poder venderlo.
              </p>
            )}
          </section>
        )}
      </div>

      <PieModal alCerrar={alCerrar} cargando={cargando} onGuardar={guardar} etiquetaGuardar={esNuevo ? "Crear producto" : "Guardar cambios"} />
    </Modal>
  );
}
