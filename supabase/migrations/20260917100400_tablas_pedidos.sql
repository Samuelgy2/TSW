-- ---------------------------------------------------------------------------
-- TSW — 05. Pedidos, ítems y transacciones de Wompi
--
-- Núcleo transaccional del sitio. Tres reglas lo gobiernan:
--   1. El histórico se congela: pedido_item copia precio, nombre y talla.
--   2. Nada se borra: una variante vendida se desactiva, no se elimina.
--   3. El webhook es idempotente gracias al UNIQUE de transaccion.wompi_id.
--
-- Ninguna de estas tablas tiene lectura anónima (migración 08).
-- ---------------------------------------------------------------------------

-- --- pedido -----------------------------------------------------------------

create table public.pedido (
  id                 uuid primary key default gen_random_uuid(),
  referencia         text not null,
  estado             public.estado_pedido not null default 'pendiente',
  total_centavos     integer not null default 0,
  comprador_nombre   text not null,
  comprador_email    text not null,
  comprador_telefono text not null,
  notas              text,
  reserva_expira_en  timestamptz not null default now() + interval '2 hours',
  pagado_en          timestamptz,
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),

  constraint pedido_referencia_unica unique (referencia),
  -- El formato lo produce generar_referencia_pedido() (migración 07); el CHECK
  -- impide que entre una referencia armada a mano por otro camino.
  constraint pedido_referencia_formato check (referencia ~ '^TSW-[0-9]{4}-[0-9]{6}$'),
  -- Arranca en 0 y lo recalcula el trigger de pedido_item: un pedido existe un
  -- instante antes de tener líneas. Que el total sea mayor que cero se exige al
  -- pagar, dentro de transicionar_pedido().
  constraint pedido_total_no_negativo check (total_centavos >= 0),
  -- Todo pedido que llegó a pagarse conserva la fecha en que se pagó.
  constraint pedido_pagado_con_fecha check (
    estado not in ('pagado', 'preparando', 'entregado') or pagado_en is not null
  ),
  constraint pedido_email_formato check (
    comprador_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  constraint pedido_nombre_no_vacio check (length(btrim(comprador_nombre)) > 0),
  constraint pedido_telefono_no_vacio check (length(btrim(comprador_telefono)) > 0)
);

comment on table public.pedido is
  'Pedido de la tienda. No hay cuentas de comprador: se identifica por su referencia y el correo de quien compró.';
comment on column public.pedido.referencia is
  'Identificador visible, formato TSW-<año>-<consecutivo de 6 dígitos>. Es lo que viaja a Wompi y lo que el comprador cita para consultar.';
comment on column public.pedido.total_centavos is
  'Total en centavos de COP. Lo mantiene el trigger recalcular_total_pedido() sumando las líneas; ni la aplicación ni el cliente lo escriben. Es el monto que se firma para Wompi.';
comment on column public.pedido.reserva_expira_en is
  'Momento en que caduca la reserva de stock: 2 horas desde la creación. Pasado ese plazo, el cron expira el pedido y libera las unidades reservadas.';
comment on column public.pedido.pagado_en is
  'Instante en que el pedido pasó a pagado. Lo fija transicionar_pedido(); no se escribe a mano.';
comment on column public.pedido.notas is
  'Observaciones del comprador sobre la entrega.';

create trigger pedido_actualizado_en
  before update on public.pedido
  for each row execute function public.set_actualizado_en();

-- El índice de `referencia` ya lo crea la restricción UNIQUE.
create index pedido_estado_creado_idx on public.pedido (estado, creado_en desc);

comment on index public.pedido_estado_creado_idx is
  'Bandeja del panel: pedidos filtrados por estado, del más reciente al más viejo.';

-- Índice parcial para la conciliación y el barrido de reservas vencidas.
-- Indexa `reserva_expira_en` y no `estado`: dentro del índice todas las filas
-- ya son 'pendiente', así que indexar esa columna no discriminaría nada.
create index pedido_pendientes_expiracion_idx
  on public.pedido (reserva_expira_en)
  where estado = 'pendiente';

comment on index public.pedido_pendientes_expiracion_idx is
  'Solo pedidos pendientes, ordenados por vencimiento de reserva. Lo usa el cron que expira pedidos y libera stock.';

-- --- pedido_item ------------------------------------------------------------

create table public.pedido_item (
  id                       uuid primary key default gen_random_uuid(),
  pedido_id                uuid not null references public.pedido (id) on delete cascade,
  -- RESTRICT: una variante con ventas no se elimina jamás, se desactiva.
  variante_id              uuid not null references public.variante (id) on delete restrict,
  cantidad                 integer not null,
  precio_unitario_centavos integer not null,
  nombre_producto          text not null,
  talla                    text not null,
  creado_en                timestamptz not null default now(),

  constraint pedido_item_variante_unica unique (pedido_id, variante_id),
  constraint pedido_item_cantidad_positiva check (cantidad > 0),
  constraint pedido_item_precio_positivo check (precio_unitario_centavos > 0)
);

comment on table public.pedido_item is
  'Línea de un pedido. Copia el precio, el nombre del producto y la talla al momento de la compra: el histórico queda congelado y el total de un pedido pasado JAMÁS se recalcula con un JOIN contra variante, porque los precios cambian.';
comment on column public.pedido_item.variante_id is
  'Referencia al catálogo solo para trazabilidad e inventario. Los datos que se muestran al comprador son las copias de esta misma fila, no los de variante.';
comment on column public.pedido_item.precio_unitario_centavos is
  'Precio vigente en el instante de la compra, en centavos de COP. Copiado, nunca derivado.';
comment on column public.pedido_item.nombre_producto is
  'Nombre del producto tal como se llamaba al comprarse. Si luego lo renombran, este pedido conserva el nombre viejo.';
comment on column public.pedido_item.talla is
  'Talla comprada, copiada de variante. Sobrevive aunque la variante se desactive.';

create index pedido_item_pedido_id_idx on public.pedido_item (pedido_id);
create index pedido_item_variante_id_idx on public.pedido_item (variante_id);

-- --- transaccion ------------------------------------------------------------

create table public.transaccion (
  id             uuid primary key default gen_random_uuid(),
  -- RESTRICT: un pedido con transacciones es evidencia contable.
  pedido_id      uuid not null references public.pedido (id) on delete restrict,
  wompi_id       text not null,
  estado         text not null,
  monto_centavos integer not null,
  metodo_pago    text,
  payload_json   jsonb not null,
  firma_valida   boolean not null default false,
  recibido_en    timestamptz not null default now(),

  -- Base de la idempotencia del webhook.
  constraint transaccion_wompi_id_unico unique (wompi_id),
  constraint transaccion_monto_no_negativo check (monto_centavos >= 0)
);

comment on table public.transaccion is
  'Evento de pago recibido de Wompi. El UNIQUE de wompi_id hace idempotente el webhook: si Wompi reenvía el evento, el INSERT falla y el handler responde 200 sin efectos secundarios.';
comment on column public.transaccion.wompi_id is
  'Identificador de la transacción en Wompi. UNIQUE: es la llave de deduplicación.';
comment on column public.transaccion.estado is
  'Estado crudo de Wompi (APPROVED, DECLINED, VOIDED, ERROR, PENDING). Es text sin CHECK a propósito: si Wompi agrega un estado nuevo, el webhook debe poder guardarlo en vez de rechazarlo.';
comment on column public.transaccion.payload_json is
  'Evento completo tal como llegó, sin transformar. Es la evidencia ante una disputa y permite reprocesar si la lógica tenía un error.';
comment on column public.transaccion.firma_valida is
  'Resultado de verificar la firma del evento. Nace en false: una transacción solo mueve el pedido si la firma se validó.';

create index transaccion_pedido_id_idx on public.transaccion (pedido_id);

-- El índice de `wompi_id` ya lo crea la restricción UNIQUE.
