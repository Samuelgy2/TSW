-- ---------------------------------------------------------------------------
-- TSW — 07. Funciones de negocio
--
--   generar_referencia_pedido()   → TSW-<año>-<consecutivo de 6 dígitos>
--   establecer_actor()            → identidad del administrador para la bitácora
--   reservar_stock()              → compromete unidades
--   liberar_reserva()             → devuelve unidades comprometidas
--   consumir_reserva()            → convierte la reserva en venta
--   recalcular_total_pedido()     → el total sale de las líneas, no de la app
--   transicionar_pedido()         → único punto donde cambia el estado
--   guardar_* / publicar_*        → RPC de escritura del panel
--
-- Todas con SECURITY DEFINER y search_path fijo, salvo establecer_actor(), que
-- tiene un motivo técnico explicado en su sitio. Al final se revoca la
-- ejecución a anon y authenticated: solo el servidor las invoca.
-- ---------------------------------------------------------------------------

-- --- Contador de referencias ------------------------------------------------

-- Una fila por año, con bloqueo a nivel de fila. Se prefiere a count(*)
-- (propenso a carreras) y a una secuencia global (que no reinicia por año y
-- deja huecos al hacer ROLLBACK).
create table public.contador_referencia (
  anio        integer primary key,
  consecutivo integer not null default 0,
  creado_en   timestamptz not null default now(),

  constraint contador_anio_valido check (anio between 2000 and 2999),
  constraint contador_consecutivo_no_negativo check (consecutivo >= 0)
);

comment on table public.contador_referencia is
  'Consecutivo de referencias de pedido por año. Lo maneja generar_referencia_pedido(); nadie más lo toca.';
comment on column public.contador_referencia.consecutivo is
  'Último número entregado en ese año. Máximo 999999 por el relleno de 6 dígitos.';
comment on column public.contador_referencia.creado_en is
  'Cuándo se abrió el año. No lleva actualizado_en: la fila cambia con cada pedido y el valor de consecutivo ya cuenta esa historia; un trigger de timestamp en esta ruta solo agregaría escritura.';

-- --- generar_referencia_pedido ----------------------------------------------

create or replace function public.generar_referencia_pedido()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anio        integer;
  v_consecutivo integer;
begin
  v_anio := extract(year from (now() at time zone 'America/Bogota'))::integer;

  -- El upsert bloquea la fila del año y devuelve el número ya incrementado:
  -- dos pedidos simultáneos se serializan aquí y no pueden recibir el mismo.
  insert into public.contador_referencia (anio, consecutivo)
  values (v_anio, 1)
  on conflict (anio)
  do update set consecutivo = public.contador_referencia.consecutivo + 1
  returning consecutivo into v_consecutivo;

  if v_consecutivo > 999999 then
    raise exception 'Se agotaron las referencias del año %: el formato admite 999999 pedidos.', v_anio
      using errcode = 'check_violation';
  end if;

  return 'TSW-' || v_anio::text || '-' || lpad(v_consecutivo::text, 6, '0');
end;
$$;

comment on function public.generar_referencia_pedido() is
  'Devuelve la siguiente referencia del año en curso (zona horaria America/Bogota). Segura bajo concurrencia por el bloqueo de fila del upsert.';

-- Ningún pedido puede nacer sin referencia.
alter table public.pedido
  alter column referencia set default public.generar_referencia_pedido();

-- --- establecer_actor -------------------------------------------------------

-- Pieza 1 de la trazabilidad. El backend escribe con la service role key, que
-- no lleva identidad de usuario, así que `auth.uid()` devuelve NULL y la
-- bitácora quedaría anónima. Esta función deja el id del administrador en una
-- variable de sesión que el trigger de auditoría lee.
--
-- OJO, y es deliberado: esta función NO lleva cláusula SET ni SECURITY DEFINER.
-- Una función con cláusula SET abre un nivel de anidamiento de GUC y Postgres
-- revierte, al salir, todo lo que se haya cambiado dentro — incluido nuestro
-- app.actor_id. Con la función "desnuda", el valor sobrevive hasta el final de
-- la transacción, que es justo lo que se necesita. A cambio, el advisor de
-- Supabase la marcará como "function_search_path_mutable"; se compensa
-- llamando a set_config con su nombre completo, pg_catalog.set_config, que no
-- depende del search_path.
create or replace function public.establecer_actor(p_actor_id uuid)
returns void
language sql
volatile
as $$
  select pg_catalog.set_config('app.actor_id', coalesce(p_actor_id::text, ''), true);
$$;

comment on function public.establecer_actor(uuid) is
  'Fija app.actor_id para el resto de la transacción, de modo que registrar_auditoria() sepa quién hizo el cambio. Toda RPC de escritura la llama antes de tocar nada.';

-- --- Ciclo del inventario ---------------------------------------------------
--
-- Tres operaciones distintas, que no deben confundirse:
--   reservar_stock   : sube stock_reservado          (el comprador aparta)
--   liberar_reserva  : baja stock_reservado          (se arrepiente o expira)
--   consumir_reserva : baja stock_reservado Y stock  (la venta se concreta)

create or replace function public.reservar_stock(
  p_variante_id uuid,
  p_cantidad    integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock      integer;
  v_reservado  integer;
  v_activo     boolean;
  v_disponible integer;
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad a reservar debe ser mayor que cero.'
      using errcode = 'check_violation';
  end if;

  -- FOR UPDATE bloquea la fila hasta el fin de la transacción: dos compradores
  -- simultáneos de la última unidad se atienden uno detrás del otro, y el
  -- segundo ve el stock ya comprometido. Sin esto hay sobreventa.
  select stock, stock_reservado, activo
    into v_stock, v_reservado, v_activo
    from public.variante
   where id = p_variante_id
     for update;

  if not found then
    raise exception 'La variante % no existe.', p_variante_id
      using errcode = 'foreign_key_violation';
  end if;

  if not v_activo then
    raise exception 'La variante % no está disponible para la venta.', p_variante_id
      using errcode = 'check_violation';
  end if;

  v_disponible := v_stock - v_reservado;

  if v_disponible < p_cantidad then
    raise exception 'Stock insuficiente: quedan % unidades y se pidieron %.',
      v_disponible, p_cantidad
      using errcode = 'check_violation';
  end if;

  update public.variante
     set stock_reservado = stock_reservado + p_cantidad
   where id = p_variante_id;

  return v_disponible - p_cantidad;
end;
$$;

comment on function public.reservar_stock(uuid, integer) is
  'Aparta unidades de una variante subiendo stock_reservado. Devuelve el disponible restante. Usa SELECT ... FOR UPDATE contra la sobreventa.';

create or replace function public.liberar_reserva(
  p_variante_id uuid,
  p_cantidad    integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock     integer;
  v_reservado integer;
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad a liberar debe ser mayor que cero.'
      using errcode = 'check_violation';
  end if;

  select stock, stock_reservado
    into v_stock, v_reservado
    from public.variante
   where id = p_variante_id
     for update;

  if not found then
    raise exception 'La variante % no existe.', p_variante_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_reservado < p_cantidad then
    raise exception 'No se pueden liberar % unidades: solo hay % reservadas en la variante %.',
      p_cantidad, v_reservado, p_variante_id
      using errcode = 'check_violation';
  end if;

  update public.variante
     set stock_reservado = stock_reservado - p_cantidad
   where id = p_variante_id;

  return v_stock - (v_reservado - p_cantidad);
end;
$$;

comment on function public.liberar_reserva(uuid, integer) is
  'Devuelve unidades apartadas al disponible bajando stock_reservado, sin tocar stock: la mercancía nunca salió de bodega. Se usa al expirar o rechazar un pedido, y también cuando el comprador quita un ítem del carrito antes de confirmar.';

create or replace function public.consumir_reserva(
  p_variante_id uuid,
  p_cantidad    integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock     integer;
  v_reservado integer;
begin
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad a consumir debe ser mayor que cero.'
      using errcode = 'check_violation';
  end if;

  select stock, stock_reservado
    into v_stock, v_reservado
    from public.variante
   where id = p_variante_id
     for update;

  if not found then
    raise exception 'La variante % no existe.', p_variante_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_reservado < p_cantidad then
    raise exception 'No se pueden consumir % unidades: solo hay % reservadas en la variante %.',
      p_cantidad, v_reservado, p_variante_id
      using errcode = 'check_violation';
  end if;

  if v_stock < p_cantidad then
    raise exception 'Inventario inconsistente en la variante %: stock % menor que lo vendido %.',
      p_variante_id, v_stock, p_cantidad
      using errcode = 'check_violation';
  end if;

  update public.variante
     set stock           = stock - p_cantidad,
         stock_reservado = stock_reservado - p_cantidad
   where id = p_variante_id;

  return v_stock - p_cantidad;
end;
$$;

comment on function public.consumir_reserva(uuid, integer) is
  'Convierte una reserva en venta: baja stock y stock_reservado a la vez. Devuelve el stock restante. Se llama al confirmarse el pago.';

-- --- Total del pedido -------------------------------------------------------

-- El monto que se firma para Wompi sale de la base de datos, nunca de lo que
-- mande la aplicación. Cualquier cambio en las líneas recalcula el total.
create or replace function public.recalcular_total_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido_id uuid;
  v_estado    public.estado_pedido;
begin
  v_pedido_id := coalesce(new.pedido_id, old.pedido_id);

  select estado into v_estado
    from public.pedido
   where id = v_pedido_id
     for update;

  -- El pedido ya no existe: esto es el CASCADE de un DELETE sobre pedido.
  -- No hay total que recalcular.
  if not found then
    return coalesce(new, old);
  end if;

  if v_estado <> 'pendiente' then
    raise exception 'No se pueden modificar los ítems de un pedido en estado "%": el histórico de una compra cerrada no se toca.', v_estado
      using errcode = 'restrict_violation';
  end if;

  update public.pedido
     set total_centavos = (
       select coalesce(sum(cantidad * precio_unitario_centavos), 0)
         from public.pedido_item
        where pedido_id = v_pedido_id
     )
   where id = v_pedido_id;

  return coalesce(new, old);
end;
$$;

comment on function public.recalcular_total_pedido() is
  'Mantiene pedido.total_centavos como la suma de sus líneas y prohíbe modificar los ítems de un pedido que ya salió de pendiente.';

create trigger pedido_item_recalcular_total
  after insert or update or delete on public.pedido_item
  for each row execute function public.recalcular_total_pedido();

-- --- transicionar_pedido ----------------------------------------------------

create or replace function public.transicionar_pedido(
  p_pedido_id     uuid,
  p_nuevo_estado  public.estado_pedido,
  p_actor         uuid default null
)
returns public.pedido
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado_actual public.estado_pedido;
  v_permitidos    public.estado_pedido[];
  v_total         integer;
  v_items         integer;
  v_item          record;
  v_pedido        public.pedido;
begin
  -- Quién ordena el cambio, para la bitácora.
  perform public.establecer_actor(p_actor);

  -- Bloquea el pedido: dos webhooks simultáneos de Wompi no pueden aplicar la
  -- misma transición dos veces.
  select estado, total_centavos
    into v_estado_actual, v_total
    from public.pedido
   where id = p_pedido_id
     for update;

  if not found then
    raise exception 'El pedido % no existe.', p_pedido_id
      using errcode = 'foreign_key_violation';
  end if;

  -- Máquina de estados. Lo que no está aquí, no se puede hacer.
  v_permitidos := case v_estado_actual
    when 'pendiente'  then array['pagado', 'rechazado', 'expirado']::public.estado_pedido[]
    when 'pagado'     then array['preparando']::public.estado_pedido[]
    when 'preparando' then array['entregado', 'cancelado']::public.estado_pedido[]
    else array[]::public.estado_pedido[]   -- rechazado, expirado, entregado, cancelado
  end;

  if not (p_nuevo_estado = any (v_permitidos)) then
    if array_length(v_permitidos, 1) is null then
      raise exception 'El pedido % está en estado terminal "%" y ya no admite cambios.',
        p_pedido_id, v_estado_actual
        using errcode = 'check_violation';
    else
      raise exception 'Transición inválida: un pedido en estado "%" no puede pasar a "%". Estados permitidos: %.',
        v_estado_actual, p_nuevo_estado, array_to_string(v_permitidos::text[], ', ')
        using errcode = 'check_violation';
    end if;
  end if;

  if p_nuevo_estado = 'pagado' then
    select count(*) into v_items
      from public.pedido_item
     where pedido_id = p_pedido_id;

    if v_items = 0 or v_total <= 0 then
      raise exception 'El pedido % no se puede marcar como pagado: no tiene líneas o su total es cero.',
        p_pedido_id
        using errcode = 'check_violation';
    end if;
  end if;

  -- Efecto sobre el inventario. Se recorre SIEMPRE ordenado por variante_id
  -- para que dos pedidos con productos en común no se abracen en un
  -- interbloqueo.
  --
  --   pendiente  → pagado      consumir_reserva   (la venta se concreta)
  --   pendiente  → rechazado   liberar_reserva    (no se produjo nada)
  --   pendiente  → expirado    liberar_reserva    (no se produjo nada)
  --   pagado     → preparando  nada
  --   preparando → entregado   nada
  --   preparando → cancelado   nada  ← asimetría deliberada
  --
  -- Cancelar desde preparando NO repone inventario: los uniformes llevan
  -- estampado personalizado, la unidad ya se intervino y no vuelve a ser
  -- vendible. Reponerla inflaría el stock con mercancía que no existe.
  for v_item in
    select variante_id, cantidad
      from public.pedido_item
     where pedido_id = p_pedido_id
     order by variante_id
  loop
    if p_nuevo_estado = 'pagado' then
      perform public.consumir_reserva(v_item.variante_id, v_item.cantidad);
    elsif p_nuevo_estado in ('rechazado', 'expirado') then
      perform public.liberar_reserva(v_item.variante_id, v_item.cantidad);
    end if;
  end loop;

  update public.pedido
     set estado    = p_nuevo_estado,
         pagado_en = case when p_nuevo_estado = 'pagado' then now() else pagado_en end
   where id = p_pedido_id
  returning * into v_pedido;

  return v_pedido;
end;
$$;

comment on function public.transicionar_pedido(uuid, public.estado_pedido, uuid) is
  'Único punto donde cambia el estado de un pedido. Valida la máquina de estados, mueve el inventario (pagado consume la reserva; rechazado y expirado la liberan; cancelar desde preparando no repone nada porque el producto ya se personalizó), fija pagado_en y propaga el actor a la auditoría.';

-- ---------------------------------------------------------------------------
-- RPC DE ESCRITURA DEL PANEL
--
-- Pieza 3 de la trazabilidad. Cada operación administrativa entra por aquí,
-- empieza fijando el actor y escribe en la misma transacción. El panel NUNCA
-- escribe directo a las tablas: si lo hiciera, la bitácora quedaría anónima y
-- dejaría de servir para lo único que sirve, saber quién rompió qué.
--
-- Convención: primer parámetro siempre p_actor_id. Si p_id llega NULL se crea;
-- si llega con valor se actualiza.
-- ---------------------------------------------------------------------------

create or replace function public.guardar_documento(
  p_actor_id    uuid,
  p_id          uuid    default null,
  p_titulo      text    default null,
  p_descripcion text    default null,
  p_activo      boolean default true,
  p_orden       integer default 0
)
returns public.documento
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fila public.documento;
begin
  perform public.establecer_actor(p_actor_id);

  if p_id is null then
    insert into public.documento (titulo, descripcion, activo, orden)
    values (p_titulo, p_descripcion, p_activo, p_orden)
    returning * into v_fila;
  else
    update public.documento
       set titulo      = coalesce(p_titulo, titulo),
           descripcion = p_descripcion,
           activo      = p_activo,
           orden       = p_orden
     where id = p_id
    returning * into v_fila;

    if not found then
      raise exception 'El documento % no existe.', p_id
        using errcode = 'foreign_key_violation';
    end if;
  end if;

  return v_fila;
end;
$$;

comment on function public.guardar_documento(uuid, uuid, text, text, boolean, integer) is
  'Crea o actualiza un documento dejando constancia del administrador que lo hizo.';

create or replace function public.publicar_documento_version(
  p_actor_id      uuid,
  p_documento_id  uuid,
  p_version       integer,
  p_storage_path  text,
  p_nombre_archivo text,
  p_tamano_bytes  integer
)
returns public.documento_version
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fila public.documento_version;
begin
  perform public.establecer_actor(p_actor_id);

  -- La versión se pide antes con siguiente_version_documento(), porque el
  -- número va dentro de storage_path y el archivo se sube primero.
  insert into public.documento_version (
    documento_id, version, storage_path, nombre_archivo, tamano_bytes, subido_por
  ) values (
    p_documento_id, p_version, p_storage_path, p_nombre_archivo, p_tamano_bytes, p_actor_id
  )
  returning * into v_fila;

  return v_fila;
end;
$$;

comment on function public.publicar_documento_version(uuid, uuid, integer, text, text, integer) is
  'Publica una versión nueva de un documento. El trigger archiva la anterior en la misma transacción. Orden de uso: siguiente_version_documento() → subir el archivo → esta función.';

create or replace function public.guardar_producto(
  p_actor_id    uuid,
  p_id          uuid    default null,
  p_nombre      text    default null,
  p_slug        text    default null,
  p_categoria   public.categoria_producto default 'uniformes',
  p_descripcion text    default null,
  p_activo      boolean default true,
  p_orden       integer default 0
)
returns public.producto
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fila public.producto;
begin
  perform public.establecer_actor(p_actor_id);

  if p_id is null then
    insert into public.producto (nombre, slug, categoria, descripcion, activo, orden)
    values (p_nombre, p_slug, p_categoria, p_descripcion, p_activo, p_orden)
    returning * into v_fila;
  else
    update public.producto
       set nombre      = coalesce(p_nombre, nombre),
           slug        = coalesce(p_slug, slug),
           categoria   = p_categoria,
           descripcion = p_descripcion,
           activo      = p_activo,
           orden       = p_orden
     where id = p_id
    returning * into v_fila;

    if not found then
      raise exception 'El producto % no existe.', p_id
        using errcode = 'foreign_key_violation';
    end if;
  end if;

  return v_fila;
end;
$$;

comment on function public.guardar_producto(uuid, uuid, text, text, public.categoria_producto, text, boolean, integer) is
  'Crea o actualiza un producto del catálogo dejando constancia del administrador.';

create or replace function public.guardar_variante(
  p_actor_id       uuid,
  p_id             uuid    default null,
  p_producto_id    uuid    default null,
  p_talla          text    default null,
  p_precio_centavos integer default null,
  -- NULL, no 0: omitir el parámetro en una edición debe dejar el stock como
  -- estaba, no vaciar la bodega.
  p_stock          integer default null,
  p_sku            text    default null,
  p_activo         boolean default true
)
returns public.variante
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fila public.variante;
begin
  perform public.establecer_actor(p_actor_id);

  if p_id is null then
    insert into public.variante (producto_id, talla, precio_centavos, stock, sku, activo)
    values (p_producto_id, p_talla, p_precio_centavos, coalesce(p_stock, 0), p_sku, p_activo)
    returning * into v_fila;
  else
    -- stock_reservado no se toca nunca por aquí: lo mueven reservar_stock,
    -- liberar_reserva y consumir_reserva, que son las que saben del ciclo.
    update public.variante
       set talla           = coalesce(p_talla, talla),
           precio_centavos = coalesce(p_precio_centavos, precio_centavos),
           stock           = coalesce(p_stock, stock),
           sku             = p_sku,
           activo          = p_activo
     where id = p_id
    returning * into v_fila;

    if not found then
      raise exception 'La variante % no existe.', p_id
        using errcode = 'foreign_key_violation';
    end if;
  end if;

  return v_fila;
end;
$$;

comment on function public.guardar_variante(uuid, uuid, uuid, text, integer, integer, text, boolean) is
  'Crea o actualiza una variante. No toca stock_reservado: eso solo lo mueve el ciclo de inventario.';

create or replace function public.guardar_competencia(
  p_actor_id   uuid,
  p_id         uuid    default null,
  p_titulo     text    default null,
  p_slug       text    default null,
  p_fecha      date    default null,
  p_cuerpo     text    default null,
  p_estado     public.estado_publicacion default 'borrador',
  p_destacado  boolean default false,
  p_imagen_path text   default null
)
returns public.competencia
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fila public.competencia;
begin
  perform public.establecer_actor(p_actor_id);

  if p_id is null then
    insert into public.competencia (titulo, slug, fecha, cuerpo, estado, destacado, imagen_path)
    values (p_titulo, p_slug, p_fecha, p_cuerpo, p_estado, p_destacado, p_imagen_path)
    returning * into v_fila;
  else
    update public.competencia
       set titulo      = coalesce(p_titulo, titulo),
           slug        = coalesce(p_slug, slug),
           fecha       = coalesce(p_fecha, fecha),
           cuerpo      = p_cuerpo,
           estado      = p_estado,
           destacado   = p_destacado,
           imagen_path = p_imagen_path
     where id = p_id
    returning * into v_fila;

    if not found then
      raise exception 'La competencia % no existe.', p_id
        using errcode = 'foreign_key_violation';
    end if;
  end if;

  return v_fila;
end;
$$;

comment on function public.guardar_competencia(uuid, uuid, text, text, date, text, public.estado_publicacion, boolean, text) is
  'Crea o actualiza una competencia. Marcarla como destacada desmarca la anterior por trigger.';

create or replace function public.guardar_resultado(
  p_actor_id      uuid,
  p_id            uuid    default null,
  p_competencia_id uuid   default null,
  p_rider         text    default null,
  p_categoria     text    default null,
  p_puesto        integer default null
)
returns public.resultado
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fila public.resultado;
begin
  perform public.establecer_actor(p_actor_id);

  if p_id is null then
    insert into public.resultado (competencia_id, rider, categoria, puesto)
    values (p_competencia_id, p_rider, p_categoria, p_puesto)
    returning * into v_fila;
  else
    update public.resultado
       set rider     = coalesce(p_rider, rider),
           categoria = coalesce(p_categoria, categoria),
           puesto    = coalesce(p_puesto, puesto)
     where id = p_id
    returning * into v_fila;

    if not found then
      raise exception 'El resultado % no existe.', p_id
        using errcode = 'foreign_key_violation';
    end if;
  end if;

  return v_fila;
end;
$$;

comment on function public.guardar_resultado(uuid, uuid, uuid, text, text, integer) is
  'Crea o actualiza el puesto de un rider en una competencia.';

create or replace function public.guardar_nivel(
  p_actor_id          uuid,
  p_id                uuid    default null,
  p_nombre            text    default null,
  p_orden             integer default null,
  p_rango_edad        text    default null,
  p_horario           text    default null,
  p_descripcion       text    default null,
  p_criterio_promocion text   default null,
  p_activo            boolean default true
)
returns public.nivel
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fila public.nivel;
begin
  perform public.establecer_actor(p_actor_id);

  if p_id is null then
    insert into public.nivel (nombre, orden, rango_edad, horario, descripcion, criterio_promocion, activo)
    values (p_nombre, p_orden, p_rango_edad, p_horario, p_descripcion, p_criterio_promocion, p_activo)
    returning * into v_fila;
  else
    update public.nivel
       set nombre             = coalesce(p_nombre, nombre),
           orden              = coalesce(p_orden, orden),
           rango_edad         = p_rango_edad,
           horario            = p_horario,
           descripcion        = p_descripcion,
           criterio_promocion = p_criterio_promocion,
           activo             = p_activo
     where id = p_id
    returning * into v_fila;

    if not found then
      raise exception 'El nivel % no existe.', p_id
        using errcode = 'foreign_key_violation';
    end if;
  end if;

  return v_fila;
end;
$$;

comment on function public.guardar_nivel(uuid, uuid, text, integer, text, text, text, text, boolean) is
  'Crea o actualiza un semillero o nivel de formación.';

-- --- Permisos de ejecución --------------------------------------------------

-- Por defecto Postgres concede EXECUTE a PUBLIC. En funciones SECURITY DEFINER
-- eso significaría que cualquiera con la anon key podría mover pedidos, tocar
-- inventario o escribir contenido saltándose RLS. Se revoca todo y se concede
-- solo al servidor.
revoke execute on function public.generar_referencia_pedido() from public, anon, authenticated;
revoke execute on function public.establecer_actor(uuid) from public, anon, authenticated;
revoke execute on function public.reservar_stock(uuid, integer) from public, anon, authenticated;
revoke execute on function public.liberar_reserva(uuid, integer) from public, anon, authenticated;
revoke execute on function public.consumir_reserva(uuid, integer) from public, anon, authenticated;
revoke execute on function public.transicionar_pedido(uuid, public.estado_pedido, uuid) from public, anon, authenticated;
revoke execute on function public.guardar_documento(uuid, uuid, text, text, boolean, integer) from public, anon, authenticated;
revoke execute on function public.publicar_documento_version(uuid, uuid, integer, text, text, integer) from public, anon, authenticated;
revoke execute on function public.guardar_producto(uuid, uuid, text, text, public.categoria_producto, text, boolean, integer) from public, anon, authenticated;
revoke execute on function public.guardar_variante(uuid, uuid, uuid, text, integer, integer, text, boolean) from public, anon, authenticated;
revoke execute on function public.guardar_competencia(uuid, uuid, text, text, date, text, public.estado_publicacion, boolean, text) from public, anon, authenticated;
revoke execute on function public.guardar_resultado(uuid, uuid, uuid, text, text, integer) from public, anon, authenticated;
revoke execute on function public.guardar_nivel(uuid, uuid, text, integer, text, text, text, text, boolean) from public, anon, authenticated;

grant execute on function public.generar_referencia_pedido() to service_role;
grant execute on function public.establecer_actor(uuid) to service_role;
grant execute on function public.reservar_stock(uuid, integer) to service_role;
grant execute on function public.liberar_reserva(uuid, integer) to service_role;
grant execute on function public.consumir_reserva(uuid, integer) to service_role;
grant execute on function public.transicionar_pedido(uuid, public.estado_pedido, uuid) to service_role;
grant execute on function public.guardar_documento(uuid, uuid, text, text, boolean, integer) to service_role;
grant execute on function public.publicar_documento_version(uuid, uuid, integer, text, text, integer) to service_role;
grant execute on function public.guardar_producto(uuid, uuid, text, text, public.categoria_producto, text, boolean, integer) to service_role;
grant execute on function public.guardar_variante(uuid, uuid, uuid, text, integer, integer, text, boolean) to service_role;
grant execute on function public.guardar_competencia(uuid, uuid, text, text, date, text, public.estado_publicacion, boolean, text) to service_role;
grant execute on function public.guardar_resultado(uuid, uuid, uuid, text, text, integer) to service_role;
grant execute on function public.guardar_nivel(uuid, uuid, text, integer, text, text, text, text, boolean) to service_role;
