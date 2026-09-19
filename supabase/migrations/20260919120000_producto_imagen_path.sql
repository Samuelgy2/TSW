-- ---------------------------------------------------------------------------
-- TSW — 12. Imagen del producto y RPC mínimas de producto
--
-- El panel sube fotos del catálogo al bucket `productos` (migración 09), pero
-- `producto` no tenía dónde guardar la ruta. Se agrega `imagen_path`, con la
-- misma convención que `competencia.imagen_path`: relativa al bucket; la URL
-- pública la arma la aplicación con urlPublicaStorage().
--
-- Y se aplica a producto la misma regla que la migración 11 aplicó a
-- competencia: una acción parcial no pasa por la RPC de reemplazo total.
--
--   guardar_producto(p_actor_id, p_id, p_nombre, p_slug, p_categoria,
--                    p_descripcion, p_activo, p_orden)
--       Reemplazo total de lo que es el formulario, sin coalesce. No recibe
--       imagen_path: la foto entra solo por establecer_imagen_producto, así
--       ningún guardado del formulario puede borrarla.
--
--   alternar_producto_activo(p_actor_id, p_id, p_activo)
--       Un booleano, un UPDATE.
--
--   establecer_imagen_producto(p_actor_id, p_id, p_imagen_path)
--       La única forma de escribir producto.imagen_path.
--
-- Nada aquí depende de constraints diferidos ni de bloqueos de conjunto:
-- son escrituras de una sola fila por id. `producto` no tiene UNIQUE sobre
-- `orden` (solo sobre `slug`), así que el formulario manda `orden` como un
-- campo más y no hace falta RPC de reordenamiento.
--
-- Convenciones de toda RPC de escritura (migración 07): primer parámetro
-- p_actor_id, `security definer`, `set search_path = public`, la primera
-- línea es establecer_actor(), y solo service_role puede ejecutarla.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- producto.imagen_path
-- ---------------------------------------------------------------------------

alter table public.producto
  add column imagen_path text;

comment on column public.producto.imagen_path is
  'Ruta de la foto dentro del bucket productos, relativa al bucket (p. ej. productos/{uuid}.jpg). NULL = sin foto. Solo la escribe establecer_imagen_producto; la URL pública la arma la aplicación.';

-- ---------------------------------------------------------------------------
-- guardar_producto
-- ---------------------------------------------------------------------------

-- La firma de la migración 07 está aplicada en remoto. Sin este drop, el
-- create de abajo dejaría dos sobrecargas y PostgREST no sabría cuál elegir
-- (PGRST203). Firma exacta y sin cascade: nada depende de ella.
drop function if exists public.guardar_producto(
  uuid, uuid, text, text, public.categoria_producto, text, boolean, integer
);

-- Reemplazo total de lo que es el formulario. Sin coalesce a propósito: lo
-- que llega se escribe, y vaciar un campo opcional es una decisión válida
-- del administrador. `imagen_path` no se toca aquí.
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
       set nombre      = p_nombre,
           slug        = p_slug,
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
  'Crea o actualiza un producto del catálogo dejando constancia del administrador. El formulario es el estado completo de la fila; no toca imagen_path, que va por establecer_imagen_producto.';

-- Los privilegios se fueron con el drop: se vuelven a fijar.
revoke execute on function public.guardar_producto(uuid, uuid, text, text, public.categoria_producto, text, boolean, integer) from public, anon, authenticated;
grant execute on function public.guardar_producto(uuid, uuid, text, text, public.categoria_producto, text, boolean, integer) to service_role;

-- ---------------------------------------------------------------------------
-- alternar_producto_activo
-- ---------------------------------------------------------------------------

-- Desactivar es la salida en vez de eliminar: variante → producto y
-- pedido_item → variante son RESTRICT, y un producto vendido es parte del
-- histórico de una compra. No toca imagen_path, categoria, descripcion ni
-- orden.
create or replace function public.alternar_producto_activo(
  p_actor_id uuid,
  p_id       uuid,
  p_activo   boolean
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

  update public.producto
     set activo = p_activo
   where id = p_id
  returning * into v_fila;

  if not found then
    raise exception 'El producto % no existe.', p_id
      using errcode = 'foreign_key_violation';
  end if;

  return v_fila;
end;
$$;

comment on function public.alternar_producto_activo(uuid, uuid, boolean) is
  'Activa o desactiva un producto sin tocar el resto de la fila. Desactivado, deja de verse en la tienda y conserva su historial de pedidos.';

revoke execute on function public.alternar_producto_activo(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.alternar_producto_activo(uuid, uuid, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- establecer_imagen_producto
-- ---------------------------------------------------------------------------

-- Única forma de escribir producto.imagen_path. NULL quita la foto de la
-- fila; el objeto de Storage lo borra la aplicación, no la base.
create or replace function public.establecer_imagen_producto(
  p_actor_id    uuid,
  p_id          uuid,
  p_imagen_path text
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

  update public.producto
     set imagen_path = p_imagen_path
   where id = p_id
  returning * into v_fila;

  if not found then
    raise exception 'El producto % no existe.', p_id
      using errcode = 'foreign_key_violation';
  end if;

  return v_fila;
end;
$$;

comment on function public.establecer_imagen_producto(uuid, uuid, text) is
  'Fija o quita (NULL) la ruta de la foto de un producto dejando constancia del administrador.';

revoke execute on function public.establecer_imagen_producto(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.establecer_imagen_producto(uuid, uuid, text) to service_role;
