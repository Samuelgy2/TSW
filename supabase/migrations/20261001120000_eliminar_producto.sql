-- eliminar_producto: borrado real de un producto SIN pedidos.
--
-- variante → producto y pedido_item → variante son RESTRICT a propósito: un
-- producto vendido es parte del histórico de una compra y se desactiva. Aquí
-- solo se borra lo que nunca se vendió (típico: un producto creado por error).
-- Si alguna variante tiene pedido_item, se rechaza con un mensaje claro y el
-- camino sigue siendo alternar_producto_activo.
--
-- Devuelve imagen_path para que la aplicación borre la foto del bucket
-- (público): la base no toca Storage.

create or replace function public.eliminar_producto(
  p_actor_id uuid,
  p_id       uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_imagen text;
begin
  perform public.establecer_actor(p_actor_id);

  select imagen_path into v_imagen
    from public.producto
   where id = p_id
   for update;

  if not found then
    raise exception 'El producto % no existe.', p_id
      using errcode = 'foreign_key_violation';
  end if;

  if exists (
    select 1
      from public.pedido_item i
      join public.variante v on v.id = i.variante_id
     where v.producto_id = p_id
  ) then
    raise exception 'Este producto ya tiene pedidos y no se puede eliminar. Desactívalo: deja de verse en la tienda y conserva su historial.'
      using errcode = 'restrict_violation';
  end if;

  delete from public.variante where producto_id = p_id;
  delete from public.producto where id = p_id;

  return v_imagen;
end;
$$;

comment on function public.eliminar_producto(uuid, uuid) is
  'Elimina un producto y sus variantes solo si ninguna tiene pedidos. Devuelve imagen_path (o NULL) para que la aplicación borre el archivo.';

revoke execute on function public.eliminar_producto(uuid, uuid) from public, anon, authenticated;
grant execute on function public.eliminar_producto(uuid, uuid) to service_role;
