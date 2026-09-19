-- ---------------------------------------------------------------------------
-- TSW — 11. RPC del panel: alternancias, estado de competencias e imagen
--
-- La migración 07 dejó una RPC de "guardar todo" por entidad. El panel las
-- llamaba con dos o tres parámetros para cambiar un booleano o una ruta, y
-- como esas funciones escriben `campo = p_campo` en casi todo, cada llamada
-- parcial borraba el resto de la fila. El diagnóstico no es que falte
-- `coalesce` (con `coalesce` el admin no podría vaciar un campo opcional):
-- es que una acción parcial no debe pasar por una RPC de reemplazo total.
--
-- Lo que hace esta migración:
--
--   competencia.autorizacion_imagen_en + CHECK
--       Registra cuándo se confirmó la autorización de uso de imagen. En las
--       fotos hay menores de edad: la invariante "sin autorización no hay
--       foto" vive en la tabla, no en las RPC, para que ningún camino de
--       escritura —presente o futuro— pueda saltársela.
--
--   guardar_competencia(p_actor_id, p_id, p_titulo, p_slug, p_fecha, p_cuerpo,
--                       p_autorizacion_imagen)
--       Reemplazo total de lo que es el formulario, y nada más. Salen
--       `estado`, `destacado` e `imagen_path`: cada uno tiene ahora su única
--       puerta de entrada, igual que el estado de un pedido solo cambia por
--       transicionar_pedido().
--
--   publicar_competencia / archivar_competencia / destacar_competencia
--       Las transiciones de estado y el destaque, con sus reglas.
--
--   establecer_imagen_competencia
--       La única forma de escribir competencia.imagen_path.
--
--   alternar_documento_activo / alternar_nivel_activo / alternar_variante_activa
--       Un booleano, un UPDATE. (alternar_producto_activo y
--       establecer_imagen_producto van en la migración 12, con su columna.)
--
--   eliminar_resultado(p_actor_id, p_id)
--       Un resultado mal digitado se borra. `resultado` tiene FK CASCADE con
--       su competencia y nadie más lo referencia: no hay histórico que
--       conservar y el trigger de auditoría registra `eliminar` con el actor.
--
--   reordenar_niveles(p_actor_id, p_ids)
--       Escribe la secuencia completa en una transacción pasando por valores
--       temporales: el UNIQUE de `orden` es inmediato y se queda inmediato.
--
-- Convenciones de toda RPC de escritura (migración 07): primer parámetro
-- p_actor_id, `security definer`, `set search_path = public`, la primera
-- línea es establecer_actor(), y solo service_role puede ejecutarla.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- competencia.autorizacion_imagen_en
-- ---------------------------------------------------------------------------

-- NULL = todavía no se confirmó ninguna autorización. Al escribirse por RPC,
-- la bitácora guarda quién la fijó y cuándo.
alter table public.competencia
  add column autorizacion_imagen_en timestamptz;

comment on column public.competencia.autorizacion_imagen_en is
  'Momento en que el administrador confirmó que existe autorización de uso de imagen firmada por el acudiente para las fotos de esta competencia. En las fotos hay menores de edad: sin este registro no puede haber foto (CHECK competencia_imagen_requiere_autorizacion). La bitácora guarda quién lo marcó.';

-- La garantía vive en la tabla: una fila con foto y sin autorización no
-- existe, entre por donde entre. Comprobado antes de escribir esto: en el
-- proyecto remoto ninguna competencia tiene imagen_path, así que no hay
-- filas que violen la regla al añadirla.
alter table public.competencia
  add constraint competencia_imagen_requiere_autorizacion
  check (imagen_path is null or autorizacion_imagen_en is not null);

comment on constraint competencia_imagen_requiere_autorizacion on public.competencia is
  'Control documental sobre fotos de menores: no puede haber imagen_path sin autorizacion_imagen_en. Para quitar la autorización de una competencia con foto hay que quitar primero la foto.';

-- ---------------------------------------------------------------------------
-- guardar_competencia
-- ---------------------------------------------------------------------------

-- La firma de la migración 07 está aplicada en remoto. Sin este drop, el
-- create de abajo dejaría dos sobrecargas y PostgREST no sabría cuál elegir
-- (PGRST203). Firma exacta y sin cascade: nada depende de ella.
drop function if exists public.guardar_competencia(
  uuid, uuid, text, text, date, text, public.estado_publicacion, boolean, text
);

-- Reemplazo total de lo que es el formulario. Sin coalesce a propósito: lo
-- que llega se escribe, y vaciar un campo opcional es una decisión válida
-- del administrador. `estado`, `destacado` e `imagen_path` no se tocan aquí.
create or replace function public.guardar_competencia(
  p_actor_id            uuid,
  p_id                  uuid    default null,
  p_titulo              text    default null,
  p_slug                text    default null,
  p_fecha               date    default null,
  p_cuerpo              text    default null,
  p_autorizacion_imagen boolean default false
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
    -- Nace como borrador y sin destaque: publicar y destacar son acciones
    -- aparte.
    insert into public.competencia (titulo, slug, fecha, cuerpo, autorizacion_imagen_en)
    values (
      p_titulo, p_slug, p_fecha, p_cuerpo,
      case when p_autorizacion_imagen then now() end
    )
    returning * into v_fila;
  else
    -- La autorización conserva su fecha original mientras siga marcada;
    -- desmarcarla la vuelve NULL. Si la competencia tiene foto, el CHECK
    -- competencia_imagen_requiere_autorizacion rechaza el desmarcado: hay
    -- que quitar primero la foto, nunca se borra sola.
    update public.competencia
       set titulo = p_titulo,
           slug   = p_slug,
           fecha  = p_fecha,
           cuerpo = p_cuerpo,
           autorizacion_imagen_en = case
             when p_autorizacion_imagen then coalesce(autorizacion_imagen_en, now())
           end
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

comment on function public.guardar_competencia(uuid, uuid, text, text, date, text, boolean) is
  'Crea (como borrador) o actualiza el contenido de una competencia dejando constancia del administrador. No toca estado, destacado ni imagen_path: eso va por publicar_competencia, archivar_competencia, destacar_competencia y establecer_imagen_competencia.';

-- Los privilegios se fueron con el drop: se vuelven a fijar.
revoke execute on function public.guardar_competencia(uuid, uuid, text, text, date, text, boolean) from public, anon, authenticated;
grant execute on function public.guardar_competencia(uuid, uuid, text, text, date, text, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- publicar_competencia
-- ---------------------------------------------------------------------------

-- borrador | archivado -> publicado. La foto sin autorización ya no puede
-- existir (CHECK), así que aquí no hay nada más que comprobar.
create or replace function public.publicar_competencia(
  p_actor_id uuid,
  p_id       uuid
)
returns public.competencia
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado public.estado_publicacion;
  v_fila   public.competencia;
begin
  perform public.establecer_actor(p_actor_id);

  select estado into v_estado
    from public.competencia
   where id = p_id
     for update;

  if not found then
    raise exception 'La competencia % no existe.', p_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_estado = 'publicado' then
    raise exception 'La competencia ya está publicada.'
      using errcode = 'check_violation';
  end if;

  update public.competencia
     set estado = 'publicado'
   where id = p_id
  returning * into v_fila;

  -- La fila está bloqueada desde el SELECT … FOR UPDATE de arriba; este
  -- guardia es la regla de la casa: ningún INTO sin su IF NOT FOUND.
  if not found then
    raise exception 'La competencia % no existe.', p_id
      using errcode = 'foreign_key_violation';
  end if;

  return v_fila;
end;
$$;

comment on function public.publicar_competencia(uuid, uuid) is
  'Pasa una competencia de borrador o archivado a publicado. Única forma de publicar.';

revoke execute on function public.publicar_competencia(uuid, uuid) from public, anon, authenticated;
grant execute on function public.publicar_competencia(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- archivar_competencia
-- ---------------------------------------------------------------------------

-- borrador | publicado -> archivado. Una archivada no puede seguir siendo la
-- destacada de la portada: el destaque se apaga en la misma operación.
create or replace function public.archivar_competencia(
  p_actor_id uuid,
  p_id       uuid
)
returns public.competencia
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado public.estado_publicacion;
  v_fila   public.competencia;
begin
  perform public.establecer_actor(p_actor_id);

  select estado into v_estado
    from public.competencia
   where id = p_id
     for update;

  if not found then
    raise exception 'La competencia % no existe.', p_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_estado = 'archivado' then
    raise exception 'La competencia ya está archivada.'
      using errcode = 'check_violation';
  end if;

  update public.competencia
     set estado    = 'archivado',
         destacado = false
   where id = p_id
  returning * into v_fila;

  -- La fila está bloqueada desde el SELECT … FOR UPDATE de arriba; este
  -- guardia es la regla de la casa: ningún INTO sin su IF NOT FOUND.
  if not found then
    raise exception 'La competencia % no existe.', p_id
      using errcode = 'foreign_key_violation';
  end if;

  return v_fila;
end;
$$;

comment on function public.archivar_competencia(uuid, uuid) is
  'Archiva una competencia y le quita el destaque. Se puede volver a publicar con publicar_competencia.';

revoke execute on function public.archivar_competencia(uuid, uuid) from public, anon, authenticated;
grant execute on function public.archivar_competencia(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- destacar_competencia
-- ---------------------------------------------------------------------------

-- Solo se destaca una competencia publicada. El trigger
-- competencia_destacada_exclusiva (migración 04) desmarca la anterior en la
-- misma transacción; aquí no hay que hacerlo a mano.
create or replace function public.destacar_competencia(
  p_actor_id  uuid,
  p_id        uuid,
  p_destacado boolean
)
returns public.competencia
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado public.estado_publicacion;
  v_fila   public.competencia;
begin
  perform public.establecer_actor(p_actor_id);

  select estado into v_estado
    from public.competencia
   where id = p_id
     for update;

  if not found then
    raise exception 'La competencia % no existe.', p_id
      using errcode = 'foreign_key_violation';
  end if;

  if p_destacado and v_estado <> 'publicado' then
    raise exception 'Solo se puede destacar una competencia publicada.'
      using errcode = 'check_violation';
  end if;

  update public.competencia
     set destacado = p_destacado
   where id = p_id
  returning * into v_fila;

  -- La fila está bloqueada desde el SELECT … FOR UPDATE de arriba; este
  -- guardia es la regla de la casa: ningún INTO sin su IF NOT FOUND.
  if not found then
    raise exception 'La competencia % no existe.', p_id
      using errcode = 'foreign_key_violation';
  end if;

  return v_fila;
end;
$$;

comment on function public.destacar_competencia(uuid, uuid, boolean) is
  'Marca o desmarca la competencia destacada de la portada. Al marcar una, el trigger desmarca la anterior.';

revoke execute on function public.destacar_competencia(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.destacar_competencia(uuid, uuid, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- establecer_imagen_competencia
-- ---------------------------------------------------------------------------

-- Única forma de escribir competencia.imagen_path. NULL quita la foto de la
-- fila (el objeto de Storage lo borra la aplicación, no la base). Sin
-- autorización registrada, el CHECK rechaza cualquier ruta: la regla no se
-- repite aquí para que exista en un solo sitio.
create or replace function public.establecer_imagen_competencia(
  p_actor_id    uuid,
  p_id          uuid,
  p_imagen_path text
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

  update public.competencia
     set imagen_path = p_imagen_path
   where id = p_id
  returning * into v_fila;

  if not found then
    raise exception 'La competencia % no existe.', p_id
      using errcode = 'foreign_key_violation';
  end if;

  return v_fila;
end;
$$;

comment on function public.establecer_imagen_competencia(uuid, uuid, text) is
  'Fija o quita (NULL) la ruta de la foto de una competencia. Exige autorización de uso de imagen registrada, por el CHECK de la tabla.';

revoke execute on function public.establecer_imagen_competencia(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.establecer_imagen_competencia(uuid, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Alternancias: un booleano, un UPDATE
-- ---------------------------------------------------------------------------

create or replace function public.alternar_documento_activo(
  p_actor_id uuid,
  p_id       uuid,
  p_activo   boolean
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

  update public.documento
     set activo = p_activo
   where id = p_id
  returning * into v_fila;

  if not found then
    raise exception 'El documento % no existe.', p_id
      using errcode = 'foreign_key_violation';
  end if;

  return v_fila;
end;
$$;

comment on function public.alternar_documento_activo(uuid, uuid, boolean) is
  'Activa o desactiva un documento sin tocar el resto de la fila. Desactivado, deja de verse en /matriculas.';

revoke execute on function public.alternar_documento_activo(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.alternar_documento_activo(uuid, uuid, boolean) to service_role;

create or replace function public.alternar_nivel_activo(
  p_actor_id uuid,
  p_id       uuid,
  p_activo   boolean
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

  update public.nivel
     set activo = p_activo
   where id = p_id
  returning * into v_fila;

  if not found then
    raise exception 'El nivel % no existe.', p_id
      using errcode = 'foreign_key_violation';
  end if;

  return v_fila;
end;
$$;

comment on function public.alternar_nivel_activo(uuid, uuid, boolean) is
  'Activa o desactiva un nivel sin tocar el resto de la fila. Desactivado, deja de verse en /semilleros y en la portada.';

revoke execute on function public.alternar_nivel_activo(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.alternar_nivel_activo(uuid, uuid, boolean) to service_role;

-- No toca stock ni stock_reservado: una variante desactivada con reservas
-- vivas sigue siendo parte de pedidos pendientes, y el ciclo de inventario
-- (reservar_stock, liberar_reserva, consumir_reserva) es el único que los
-- mueve.
create or replace function public.alternar_variante_activa(
  p_actor_id uuid,
  p_id       uuid,
  p_activo   boolean
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

  update public.variante
     set activo = p_activo
   where id = p_id
  returning * into v_fila;

  if not found then
    raise exception 'La variante % no existe.', p_id
      using errcode = 'foreign_key_violation';
  end if;

  return v_fila;
end;
$$;

comment on function public.alternar_variante_activa(uuid, uuid, boolean) is
  'Activa o desactiva una variante (talla) sin tocar precio, stock ni sku. Desactivada, no se puede comprar.';

revoke execute on function public.alternar_variante_activa(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.alternar_variante_activa(uuid, uuid, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- eliminar_resultado
-- ---------------------------------------------------------------------------

create or replace function public.eliminar_resultado(
  p_actor_id uuid,
  p_id       uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.establecer_actor(p_actor_id);

  delete from public.resultado
   where id = p_id;

  if not found then
    raise exception 'El resultado % no existe.', p_id
      using errcode = 'foreign_key_violation';
  end if;
end;
$$;

comment on function public.eliminar_resultado(uuid, uuid) is
  'Elimina un resultado mal digitado dejando constancia del administrador en la bitácora. Solo existe para corregir errores de digitación: la FK con competencia es CASCADE, no hay nada más que referencie la fila.';

revoke execute on function public.eliminar_resultado(uuid, uuid) from public, anon, authenticated;
grant execute on function public.eliminar_resultado(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- reordenar_niveles
-- ---------------------------------------------------------------------------

-- nivel_orden_unico (migración 02) es UNIQUE inmediato, no diferible, y se
-- queda así: sirve para ON CONFLICT y nadie puede desactivarlo por descuido.
-- Postgres comprueba un UNIQUE fila a fila incluso dentro de un solo UPDATE,
-- así que reescribir la secuencia de frente puede chocar a mitad de camino.
-- La técnica es la del valor temporal, en dos pasos dentro de la misma
-- transacción:
--
--   1. Cada nivel de la lista pasa a un orden negativo que ningún nivel ocupa
--      (por debajo del mínimo actual y de 0). Sin colisiones entre sí ni con
--      nadie, y fuera del rango 1..N que viene después.
--   2. Cada nivel recibe su posición final 1..N. Como la lista es el conjunto
--      completo y todos están en negativo, ningún positivo está ocupado.
--
-- Exigir el conjunto completo no es capricho: con una lista parcial, un nivel
-- fuera de ella podría tener justo el orden que otro va a recibir.
create or replace function public.reordenar_niveles(
  p_actor_id uuid,
  p_ids      uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_base  integer;
begin
  perform public.establecer_actor(p_actor_id);

  -- Bloqueo de tabla, no de filas: FOR UPDATE solo retiene las filas que ya
  -- existen y dejaría colarse un INSERT concurrente entre las comprobaciones
  -- y el reacomodo. SHARE ROW EXCLUSIVE frena INSERT, UPDATE y DELETE ajenos
  -- hasta el COMMIT sin bloquear las lecturas. Va antes de cualquier lectura
  -- de la tabla: todo lo que se comprueba abajo se comprueba sobre el
  -- conjunto que se va a reescribir.
  lock table public.nivel in share row exclusive mode;

  -- El orden nuevo es la posición de cada id en el arreglo: primero el 1,
  -- después el 2, y así. Un arreglo vacío o con duplicados se rechaza antes
  -- de tocar nada.
  if array_length(p_ids, 1) is null then
    raise exception 'La lista de niveles está vacía.'
      using errcode = 'check_violation';
  end if;

  if (select count(*) from unnest(p_ids) u) <> (select count(distinct u) from unnest(p_ids) u) then
    raise exception 'La lista de niveles tiene ids repetidos.'
      using errcode = 'check_violation';
  end if;

  -- Los ids que no existen fallan aquí, con el conjunto completo a la vista.
  if exists (
    select 1
      from unnest(p_ids) as u(id)
     where not exists (select 1 from public.nivel n where n.id = u.id)
  ) then
    raise exception 'Algún nivel de la lista ya no existe. Recarga la página e inténtalo de nuevo.'
      using errcode = 'foreign_key_violation';
  end if;

  -- Conjunto completo: mismos elementos que la tabla, ni uno más ni uno menos.
  -- v_base es el menor entre el mínimo actual y 0: así los temporales quedan
  -- por debajo de todo lo que existe Y por debajo de 1, fuera del rango final.
  select count(*), least(coalesce(min(orden), 0), 0)
    into v_total, v_base
    from public.nivel;

  if v_total <> array_length(p_ids, 1) then
    raise exception 'La lista debe incluir todos los niveles (hay % y llegaron %). Recarga la página e inténtalo de nuevo.',
      v_total, array_length(p_ids, 1)
      using errcode = 'check_violation';
  end if;

  -- Paso 1: todos a negativos libres, por debajo del mínimo actual.
  update public.nivel n
     set orden = v_base - ordenado.posicion
    from unnest(p_ids) with ordinality as ordenado(id, posicion)
   where n.id = ordenado.id;

  -- Paso 2: posiciones finales 1..N. No queda ningún positivo ocupado.
  update public.nivel n
     set orden = ordenado.posicion
    from unnest(p_ids) with ordinality as ordenado(id, posicion)
   where n.id = ordenado.id;
end;
$$;

comment on function public.reordenar_niveles(uuid, uuid[]) is
  'Reordena los niveles según la posición de cada id en el arreglo, en una sola transacción y sin depender de constraints diferidos. Exige el conjunto completo: no reordena parcialidades.';

revoke execute on function public.reordenar_niveles(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.reordenar_niveles(uuid, uuid[]) to service_role;
