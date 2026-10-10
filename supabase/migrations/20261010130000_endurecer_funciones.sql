-- Endurece tres funciones que marca el Security Advisor de Supabase.
-- Migración SEPARADA de 20261010120000_rls_admin_exige_aal2 (ya aplicada y
-- verificada): esa cubre las políticas RLS; estas funciones no pasan por RLS.
--
-- Quién llama a cada una (revisado en src/ y en las migraciones):
--
--  · siguiente_version_documento(uuid): SECURITY DEFINER, sin ninguna
--    comprobación interna del llamador. Solo la llama prepararVersionDocumento
--    (features/admin/acciones-contenido.ts) a través de ejecutarRpc, que corre
--    con service role DESPUÉS de exigirAdmin(). Nadie la llama con sesión de
--    usuario, pero authenticated tenía EXECUTE (migración 02): cualquier
--    cuenta, incluso un usuario sin panel, podía preguntar el consecutivo de
--    cualquier documento por PostgREST, saltándose RLS. Se le quita a
--    authenticated: la ruta de servidor no cambia.
--
--  · establecer_actor(uuid): SECURITY INVOKER; ya NO es ejecutable por
--    anon ni authenticated (solo postgres y service_role), así que un usuario
--    no puede falsear el actor de la bitácora llamándola. Las RPC de negocio
--    la invocan desde dentro de su propio cuerpo. Solo se fija search_path.
--    Su cuerpo ya estaba calificado (pg_catalog.set_config).
--
--  · rls_auto_enable(): función de la plataforma (event trigger "ensure_rls",
--    dueño postgres). Un event trigger no comprueba EXECUTE al dispararse, así
--    que quitarlo a public/anon/authenticated no lo afecta, y vía RPC ya
--    fallaba sola (pg_event_trigger_ddl_commands solo existe dentro de un event
--    trigger). La migración 02b la dejó fuera por prudencia; se cierra solo el
--    privilegio, sin tocar el objeto. Si una actualización de la plataforma
--    vuelve a otorgarlo, basta repetir el REVOKE.
--
-- NO se tocan es_admin() ni es_usuario(): las usan las políticas RLS y quitarles
-- EXECUTE rompe todo. Pendiente aparte: moverlas a un esquema privado
-- (docs/estado.md).

-- --- siguiente_version_documento -------------------------------------------

create or replace function public.siguiente_version_documento(p_documento_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(max(version), 0) + 1
    from public.documento_version
   where documento_id = p_documento_id;
$$;

revoke execute on function public.siguiente_version_documento(uuid) from public, anon, authenticated;
grant  execute on function public.siguiente_version_documento(uuid) to service_role;

-- --- establecer_actor -------------------------------------------------------

alter function public.establecer_actor(uuid) set search_path = '';

-- --- rls_auto_enable (solo si existe: es de la plataforma) -------------------

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;

-- --- Aserción final ----------------------------------------------------------

do $$
declare
  v_malas text;
begin
  select string_agg(f || ' (' || r || ')', ', ')
    into v_malas
    from (values
      ('public.siguiente_version_documento(uuid)', 'anon'),
      ('public.siguiente_version_documento(uuid)', 'authenticated'),
      ('public.establecer_actor(uuid)',            'anon'),
      ('public.establecer_actor(uuid)',            'authenticated'),
      ('public.rls_auto_enable()',                 'anon'),
      ('public.rls_auto_enable()',                 'authenticated')
    ) as t(f, r)
   where to_regprocedure(f) is not null
     and has_function_privilege(r, to_regprocedure(f), 'execute');
  if v_malas is not null then
    raise exception 'Siguen ejecutables: %', v_malas;
  end if;

  if not has_function_privilege('service_role', 'public.siguiente_version_documento(uuid)', 'execute') then
    raise exception 'service_role perdió EXECUTE en siguiente_version_documento: el panel no podría subir PDFs.';
  end if;

  -- Los helpers de RLS siguen intactos.
  if not has_function_privilege('authenticated', 'public.es_admin()', 'execute')
     or not has_function_privilege('authenticated', 'public.es_usuario()', 'execute') then
    raise exception 'es_admin() o es_usuario() perdieron EXECUTE para authenticated: las políticas RLS se romperían.';
  end if;

  -- search_path fijo y vacío en las dos funciones que se reescribieron/alteraron.
  if exists (
    select 1 from pg_proc p
     where p.oid in ('public.siguiente_version_documento(uuid)'::regprocedure, 'public.establecer_actor(uuid)'::regprocedure)
       and not coalesce(p.proconfig, '{}') @> array['search_path=""']
  ) then
    raise exception 'search_path no quedó fijado en ''''.';
  end if;
end
$$;
