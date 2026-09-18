-- ---------------------------------------------------------------------------
-- TSW — 10. Correcciones de los advisors de Supabase
--
-- Dos hallazgos legítimos del linter tras aplicar el esquema:
--   · Las funciones de trigger son SECURITY DEFINER y Postgres concede EXECUTE
--     a PUBLIC por defecto, así que quedaban expuestas en /rest/v1/rpc/...
--   · Dos claves foráneas hacia auth.users sin índice de cobertura.
-- ---------------------------------------------------------------------------

-- --- Funciones de trigger fuera de la API -----------------------------------

-- Llamarlas por RPC fallaría igual (una función de trigger sin contexto de
-- trigger lanza error), pero no tienen por qué estar en la superficie pública.
-- Revocar el EXECUTE no afecta a los triggers: Postgres verifica ese privilegio
-- al crear el trigger, no cada vez que se dispara.
revoke execute on function public.registrar_auditoria() from public, anon, authenticated;
revoke execute on function public.archivar_version_anterior() from public, anon, authenticated;
revoke execute on function public.destacar_competencia_unica() from public, anon, authenticated;
revoke execute on function public.recalcular_total_pedido() from public, anon, authenticated;

-- `documento_version_inmutable()` y `evento_auditoria_solo_insercion()` no
-- aparecen aquí porque son SECURITY INVOKER: sin privilegios elevados que
-- prestar, no son un vector.
--
-- Queda fuera a propósito `public.rls_auto_enable()`: no es del proyecto, la
-- instala la plataforma de Supabase como red de seguridad (un event trigger que
-- activa RLS en cada tabla nueva de `public`). Tocar objetos de la plataforma
-- invita a conflictos en la próxima actualización, y llamarla por RPC falla
-- sola porque pg_event_trigger_ddl_commands() solo funciona dentro de un event
-- trigger.

-- --- Índices de cobertura para las claves foráneas --------------------------

-- Se usan cuando se borra un usuario de auth.users: sin ellos, Postgres hace
-- recorrido secuencial de estas dos tablas para verificar la integridad.
create index if not exists documento_version_subido_por_idx
  on public.documento_version (subido_por);

create index if not exists evento_auditoria_actor_id_idx
  on public.evento_auditoria (actor_id);

comment on index public.evento_auditoria_actor_id_idx is
  'Cubre la FK hacia auth.users y sirve para filtrar la bitácora por administrador.';
