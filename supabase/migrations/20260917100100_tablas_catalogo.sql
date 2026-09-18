-- ---------------------------------------------------------------------------
-- TSW — 02. Catálogo: producto, variante y nivel
--
-- Tres tablas de contenido que el administrador mantiene y el público lee.
-- Sin borrado físico: se desactivan con `activo = false` porque `variante`
-- queda referenciada desde los pedidos históricos.
--
-- RLS se activa en la migración 08 (politicas_rls).
-- ---------------------------------------------------------------------------

-- --- producto ---------------------------------------------------------------

create table public.producto (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  slug           text not null,
  categoria      public.categoria_producto not null,
  descripcion    text,
  activo         boolean not null default true,
  orden          integer not null default 0,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  constraint producto_slug_unico unique (slug),
  constraint producto_slug_formato check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint producto_nombre_no_vacio check (length(btrim(nombre)) > 0)
);

comment on table public.producto is
  'Producto del catálogo de la tienda. El precio no vive aquí: cada variante tiene el suyo.';
comment on column public.producto.slug is
  'Identificador de la URL pública. Minúsculas, números y guiones.';
comment on column public.producto.activo is
  'Borrado lógico. Un producto con pedidos nunca se elimina: se desactiva.';
comment on column public.producto.orden is
  'Posición manual en el listado. Menor primero.';

-- El índice de `slug` ya lo crea la restricción UNIQUE; un segundo índice
-- sobre la misma columna sería peso muerto en cada escritura.
create index producto_categoria_activo_idx
  on public.producto (categoria)
  where activo;

comment on index public.producto_categoria_activo_idx is
  'Índice parcial para el listado público, que siempre filtra por activo.';

create trigger producto_actualizado_en
  before update on public.producto
  for each row execute function public.set_actualizado_en();

-- --- variante ---------------------------------------------------------------

create table public.variante (
  id              uuid primary key default gen_random_uuid(),
  -- RESTRICT y no CASCADE: si el producto tiene variantes con historial de
  -- ventas, borrarlo debe fallar. La salida es desactivarlo.
  producto_id     uuid not null references public.producto (id) on delete restrict,
  talla           text not null,
  precio_centavos integer not null,
  stock           integer not null default 0,
  stock_reservado integer not null default 0,
  sku             text,
  activo          boolean not null default true,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),

  constraint variante_talla_unica_por_producto unique (producto_id, talla),
  -- NULL no colisiona con NULL en Postgres: varias variantes pueden quedarse
  -- sin SKU sin chocar entre ellas.
  constraint variante_sku_unico unique (sku),
  constraint variante_precio_positivo check (precio_centavos > 0),
  constraint variante_stock_no_negativo check (stock >= 0),
  constraint variante_reservado_no_negativo check (stock_reservado >= 0),
  -- Nunca se puede reservar más de lo que hay en bodega.
  constraint variante_reservado_menor_que_stock check (stock_reservado <= stock)
);

comment on table public.variante is
  'Talla concreta de un producto, con su propio precio y su propio stock.';
comment on column public.variante.precio_centavos is
  'Precio en centavos de COP (integer). 45.000 COP se guarda como 4500000. Nunca float ni numeric.';
comment on column public.variante.stock is
  'Unidades físicas en bodega. Se descuenta al confirmarse el pago, no al reservar.';
comment on column public.variante.stock_reservado is
  'Unidades comprometidas por pedidos pendientes de pago. Disponible real = stock - stock_reservado.';
comment on column public.variante.sku is
  'Código interno de inventario. Opcional: no todos los productos lo tienen.';

create index variante_producto_id_idx on public.variante (producto_id);

create trigger variante_actualizado_en
  before update on public.variante
  for each row execute function public.set_actualizado_en();

-- --- nivel ------------------------------------------------------------------

create table public.nivel (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null,
  orden              integer not null,
  rango_edad         text,
  horario            text,
  descripcion        text,
  criterio_promocion text,
  activo             boolean not null default true,
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),

  -- UNIQUE inmediato, no diferido: así la restricción sirve para ON CONFLICT.
  -- El precio es que reordenar niveles no puede hacerse intercambiando dos
  -- filas de frente —el paso intermedio choca consigo mismo—; hay que pasar por
  -- un valor libre o reescribir la secuencia completa de órdenes.
  constraint nivel_orden_unico unique (orden),
  constraint nivel_nombre_no_vacio check (length(btrim(nombre)) > 0)
);

comment on table public.nivel is
  'Semillero o nivel de formación de la escuela. Se muestran en el orden de la columna orden.';
comment on column public.nivel.orden is
  'Posición en la ruta formativa, del nivel más básico al más avanzado. Único: reordenar exige liberar el número antes de reutilizarlo.';
comment on column public.nivel.rango_edad is
  'Texto libre, p. ej. "[6 a 9 años]". Es informativo, no se usa para validar inscripciones.';
comment on column public.nivel.criterio_promocion is
  'Qué debe lograr el deportista para pasar al siguiente nivel.';

create trigger nivel_actualizado_en
  before update on public.nivel
  for each row execute function public.set_actualizado_en();
