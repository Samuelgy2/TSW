-- Borrado duro del pedido de prueba TSW-2026-999001 (autorizado por Samuel).
--
-- Era el pedido inyectado para probar Wompi. Sus hijos van primero porque
-- transaccion.pedido_id es RESTRICT; pedido_item caería en cascada, pero se
-- borra explícito para que el orden quede escrito.
--
-- NO toca evento_auditoria: la bitácora conserva lo que pasó, y los DELETE de
-- abajo añaden sus propios eventos (con actor NULL: es una migración, no una
-- persona del panel).
--
-- La guarda aborta si algo no cuadra con lo que se autorizó, para que esta
-- migración nunca pueda borrar un pedido real aunque alguien la reutilice.

do $$
declare
  v_id     uuid;
  v_estado text;
  v_correo text;
  v_reservado integer;
begin
  select id, estado::text, comprador_email
    into v_id, v_estado, v_correo
    from public.pedido
   where referencia = 'TSW-2026-999001'
   for update;

  if v_id is null then
    raise exception 'Guarda: el pedido TSW-2026-999001 no existe; nada que borrar.';
  end if;
  if v_correo <> 'comprador.prueba@tsw.local' then
    raise exception 'Guarda: el comprador del pedido es %, no el de prueba.', v_correo;
  end if;
  if v_estado <> 'pendiente' then
    raise exception 'Guarda: el pedido está en estado %, solo se borra en pendiente.', v_estado;
  end if;

  -- Un pedido pendiente reserva stock. Si la reserva siguiera viva, borrar el
  -- pedido dejaría unidades apartadas para siempre. En el remoto es 0; la guarda
  -- lo exige en vez de suponerlo.
  select coalesce(sum(v.stock_reservado), 0) into v_reservado
    from public.variante v
   where v.id in (select variante_id from public.pedido_item where pedido_id = v_id);
  if v_reservado <> 0 then
    raise exception 'Guarda: las variantes del pedido tienen % unidades reservadas; libérelas antes.', v_reservado;
  end if;

  delete from public.transaccion where pedido_id = v_id;
  delete from public.pedido_item where pedido_id = v_id;
  delete from public.pedido      where id = v_id;
end
$$;
