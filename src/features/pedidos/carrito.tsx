"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Carrito del comprador.
 *
 * Vive en localStorage porque no hay cuentas: el visitante no inicia sesión y
 * el pedido solo existe en la base cuando confirma el checkout. Los precios
 * guardados aquí son de referencia para mostrar; el total que se cobra lo
 * recalcula la base de datos a partir de `pedido_item`.
 */
const CLAVE = "tsw.carrito.v1";

export type ItemCarrito = {
  varianteId: string;
  productoSlug: string;
  nombreProducto: string;
  talla: string;
  precioCentavos: number;
  cantidad: number;
  /** Tope de unidades según el stock disponible al momento de agregar. */
  maximo: number;
};

type ValorCarrito = {
  items: ItemCarrito[];
  /** false hasta que se lee localStorage: evita parpadeos y desajustes de hidratación. */
  cargado: boolean;
  unidades: number;
  subtotalCentavos: number;
  agregar: (item: ItemCarrito) => void;
  cambiarCantidad: (varianteId: string, cantidad: number) => void;
  quitar: (varianteId: string) => void;
  vaciar: () => void;
};

const ContextoCarrito = createContext<ValorCarrito | null>(null);

function leerAlmacen(): ItemCarrito[] {
  if (typeof window === "undefined") return [];
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return [];
    const datos: unknown = JSON.parse(crudo);
    if (!Array.isArray(datos)) return [];
    return datos.filter(
      (i): i is ItemCarrito =>
        typeof i === "object" && i !== null && typeof (i as ItemCarrito).varianteId === "string",
    );
  } catch {
    // localStorage puede estar bloqueado o traer basura: se empieza vacío.
    return [];
  }
}

export function ProveedorCarrito({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    setItems(leerAlmacen());
    setCargado(true);
  }, []);

  useEffect(() => {
    if (!cargado) return;
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(items));
    } catch {
      // Modo privado o almacenamiento lleno: el carrito sigue en memoria.
    }
  }, [items, cargado]);

  const agregar = useCallback((nuevo: ItemCarrito) => {
    setItems((previos) => {
      const existente = previos.find((i) => i.varianteId === nuevo.varianteId);
      if (!existente) return [...previos, nuevo];
      // La misma talla del mismo producto suma, no duplica la línea: es la
      // misma regla que aplica la base con UNIQUE (pedido_id, variante_id).
      const cantidad = Math.min(existente.cantidad + nuevo.cantidad, nuevo.maximo);
      return previos.map((i) => (i.varianteId === nuevo.varianteId ? { ...i, cantidad } : i));
    });
  }, []);

  const cambiarCantidad = useCallback((varianteId: string, cantidad: number) => {
    setItems((previos) =>
      previos.flatMap((i) => {
        if (i.varianteId !== varianteId) return [i];
        const acotada = Math.max(0, Math.min(cantidad, i.maximo));
        return acotada === 0 ? [] : [{ ...i, cantidad: acotada }];
      }),
    );
  }, []);

  const quitar = useCallback((varianteId: string) => {
    setItems((previos) => previos.filter((i) => i.varianteId !== varianteId));
  }, []);

  const vaciar = useCallback(() => setItems([]), []);

  const valor = useMemo<ValorCarrito>(
    () => ({
      items,
      cargado,
      unidades: items.reduce((total, i) => total + i.cantidad, 0),
      subtotalCentavos: items.reduce((total, i) => total + i.cantidad * i.precioCentavos, 0),
      agregar,
      cambiarCantidad,
      quitar,
      vaciar,
    }),
    [items, cargado, agregar, cambiarCantidad, quitar, vaciar],
  );

  return <ContextoCarrito.Provider value={valor}>{children}</ContextoCarrito.Provider>;
}

export function useCarrito(): ValorCarrito {
  const valor = useContext(ContextoCarrito);
  if (!valor) throw new Error("useCarrito debe usarse dentro de <ProveedorCarrito>.");
  return valor;
}
