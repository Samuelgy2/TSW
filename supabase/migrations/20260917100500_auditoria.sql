-- ---------------------------------------------------------------------------
-- TSW — 06. Bitácora de auditoría
--
-- La auditoría es un trigger y no una llamada desde la aplicación: así no se
-- puede olvidar ni saltar, y si falla el registro falla el cambio, porque
-- ocurre dentro de la misma transacción.
--
-- RLS se activa en la migración 08 (politicas_rls): el administrador puede
-- leer la bitácora, nadie puede escribirla a mano.
-- ---------------------------------------------------------------------------

-- --- evento_auditoria -------------------------------------------------------

create table public.evento_auditoria (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references auth.users (id) on delete set null,
  accion       public.accion_auditoria not null,
  entidad      text not null,
  entidad_id   uuid not null,
  antes_json   jsonb,
  despues_json jsonb,
  ocurrido_en  timestamptz not null default now()
);

comment on table public.evento_auditoria is
  'Quién cambió qué y cuándo. La escriben los triggers, nadie más. No se edita ni se borra.';
comment on column public.evento_auditoria.actor_id is
  'Administrador responsable, propagado por establecer_actor(). Queda en NULL si el cambio vino de un proceso automático (cron, webhook) que no identificó actor.';
comment on column public.evento_auditoria.entidad is
  'Nombre de la tabla afectada, tomado de TG_TABLE_NAME.';
comment on column public.evento_auditoria.entidad_id is
  'Clave primaria de la fila afectada.';
comment on column public.evento_auditoria.antes_json is
  'Fila antes del cambio. NULL en las creaciones.';
comment on column public.evento_auditoria.despues_json is
  'Fila después del cambio. NULL en las eliminaciones.';

create index evento_auditoria_entidad_idx
  on public.evento_auditoria (entidad, entidad_id);

comment on index public.evento_auditoria_entidad_idx is
  'Historial de una fila concreta: "todo lo que le pasó a este pedido".';

create index evento_auditoria_ocurrido_idx
  on public.evento_auditoria (ocurrido_en desc);

comment on index public.evento_auditoria_ocurrido_idx is
  'Bitácora cronológica del panel, lo más reciente primero.';

-- --- Función genérica de registro ------------------------------------------

-- SECURITY DEFINER: el trigger debe poder escribir en la bitácora aunque el
-- rol que hizo el cambio no tenga permiso sobre ella. Es justamente lo que
-- impide falsificar o suprimir un registro.
create or replace function public.registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_antes      jsonb;
  v_despues    jsonb;
  v_accion     public.accion_auditoria;
  v_actor      uuid;
  v_entidad_id uuid;
  v_estado_anterior text;
  v_estado_nuevo    text;
begin
  v_antes   := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_despues := case when tg_op = 'DELETE' then null else to_jsonb(new) end;

  -- Ley 1581 de 2012 (habeas data): la bitácora nunca se borra, así que no es
  -- lugar para conservar indefinidamente los datos de contacto del comprador.
  -- Se recortan antes de guardar; el dato vivo sigue en `pedido` el tiempo que
  -- deba estar.
  --
  -- `payload_json` de transaccion también se recorta: el evento crudo de Wompi
  -- ya está guardado en su propia fila y duplicarlo aquí solo infla la tabla.
  --
  -- En las tablas que no tienen estas columnas, el operador `-` sobre jsonb
  -- simplemente no encuentra la clave y no hace nada.
  v_antes := v_antes
    - 'comprador_nombre' - 'comprador_email' - 'comprador_telefono'
    - 'payload_json';
  v_despues := v_despues
    - 'comprador_nombre' - 'comprador_email' - 'comprador_telefono'
    - 'payload_json';

  -- En un DELETE la fila nueva no existe, así que el id sale de la vieja.
  v_entidad_id := coalesce(v_despues ->> 'id', v_antes ->> 'id')::uuid;

  -- Actor: primero la variable de sesión que fija establecer_actor(), después
  -- el JWT. Las escrituras van con la service role key, que no lleva `sub`, así
  -- que sin la variable de sesión el actor se pierde. Por eso toda operación
  -- administrativa entra por una RPC que llama a establecer_actor() primero.
  begin
    v_actor := coalesce(
      nullif(current_setting('app.actor_id', true), '')::uuid,
      auth.uid()
    );
  exception when others then
    v_actor := null;
  end;

  if tg_op = 'INSERT' then
    v_accion := 'crear';
  elsif tg_op = 'DELETE' then
    v_accion := 'eliminar';
  else
    v_estado_anterior := v_antes ->> 'estado';
    v_estado_nuevo    := v_despues ->> 'estado';

    if v_estado_nuevo is distinct from v_estado_anterior then
      -- La tabla tiene columna `estado` y cambió: se nombra el hecho, no el
      -- UPDATE genérico.
      v_accion := case v_estado_nuevo
        when 'publicado' then 'publicar'::public.accion_auditoria
        when 'archivado' then 'archivar'::public.accion_auditoria
        else 'cambiar_estado'::public.accion_auditoria
      end;
    elsif (v_antes ->> 'archivado_en') is null
      and (v_despues ->> 'archivado_en') is not null then
      -- Caso de documento_version, que archiva con fecha y no con estado.
      v_accion := 'archivar';
    else
      v_accion := 'actualizar';
    end if;
  end if;

  insert into public.evento_auditoria (
    actor_id, accion, entidad, entidad_id, antes_json, despues_json
  ) values (
    v_actor,
    v_accion,
    tg_table_name,
    v_entidad_id,
    v_antes,
    v_despues
  );

  return coalesce(new, old);
end;
$$;

comment on function public.registrar_auditoria() is
  'Trigger AFTER INSERT/UPDATE/DELETE genérico. Deduce el verbo del cambio de estado, recorta los datos de contacto del comprador (Ley 1581 de 2012) y el payload crudo de Wompi, y guarda la fila antes y después.';

-- --- Aplicación del trigger -------------------------------------------------

-- Contenido editorial y catálogo.
create trigger documento_auditoria
  after insert or update or delete on public.documento
  for each row execute function public.registrar_auditoria();

-- En documento_version, el DELETE lo rechaza antes el trigger de
-- inmutabilidad; el registro queda igual para el INSERT y para el archivado.
create trigger documento_version_auditoria
  after insert or update or delete on public.documento_version
  for each row execute function public.registrar_auditoria();

create trigger producto_auditoria
  after insert or update or delete on public.producto
  for each row execute function public.registrar_auditoria();

create trigger variante_auditoria
  after insert or update or delete on public.variante
  for each row execute function public.registrar_auditoria();

create trigger competencia_auditoria
  after insert or update or delete on public.competencia
  for each row execute function public.registrar_auditoria();

create trigger resultado_auditoria
  after insert or update or delete on public.resultado
  for each row execute function public.registrar_auditoria();

create trigger nivel_auditoria
  after insert or update or delete on public.nivel
  for each row execute function public.registrar_auditoria();

-- Compra. `transaccion` se audita sin el payload crudo, que ya vive en su
-- propia fila.
create trigger pedido_auditoria
  after insert or update or delete on public.pedido
  for each row execute function public.registrar_auditoria();

create trigger pedido_item_auditoria
  after insert or update or delete on public.pedido_item
  for each row execute function public.registrar_auditoria();

create trigger transaccion_auditoria
  after insert or update or delete on public.transaccion
  for each row execute function public.registrar_auditoria();

-- --- La bitácora no se edita ------------------------------------------------

-- RLS deja al administrador solo con lectura, pero la service role key salta
-- RLS. Este trigger cierra también esa puerta: ni el código de servidor puede
-- reescribir la historia. Para una purga por retención de datos habría que
-- deshabilitar el trigger explícitamente en una migración.
create or replace function public.evento_auditoria_solo_insercion()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'La bitácora de auditoría es de solo inserción.'
    using errcode = 'restrict_violation';
end;
$$;

comment on function public.evento_auditoria_solo_insercion() is
  'Bloquea UPDATE y DELETE sobre evento_auditoria, incluso con la service role key.';

create trigger evento_auditoria_inmutable
  before update or delete on public.evento_auditoria
  for each row execute function public.evento_auditoria_solo_insercion();
