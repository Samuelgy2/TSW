-- Un deporte nuevo nace DESACTIVADO.
--
-- guardar_deporte (migración 22) ya sabía crear (p_id null), pero la fila
-- heredaba `activo default true`: apenas guardada, aparecía en el hero y en
-- «Nuestros deportes» sin contenido. Ahora el INSERT fija activo = false y la
-- administradora lo activa con alternar_deporte_activo cuando lo termine.
--
-- Mismo contrato y misma firma que antes: solo cambia el INSERT. Los grants no
-- se tocan (create or replace los conserva).
--
-- RLS: no hace falta política nueva. deporte_escritura_admin ya es `for all`
-- (cubre INSERT) y la 20261010120000 la reescribe a es_admin_aal2(). Además el
-- panel nunca inserta directo: escribe por esta RPC con service role.

create or replace function public.guardar_deporte(
  p_actor_id    uuid,
  p_id          uuid    default null,
  p_slug        text    default null,
  p_nombre      text    default null,
  p_categoria   text    default null,
  p_descripcion text    default null,
  p_puntos      text[]  default null,
  p_pie         text    default null,
  p_orden       integer default 0
)
returns public.deporte
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fila   public.deporte;
  v_slug   text;
  v_puntos text[];
begin
  perform public.establecer_actor(p_actor_id);

  if p_nombre is null or btrim(p_nombre) = '' then
    raise exception 'Falta el nombre del deporte.'
      using errcode = 'check_violation';
  end if;

  v_puntos := coalesce(
    array(
      select btrim(t.v)
        from unnest(coalesce(p_puntos, '{}'::text[])) with ordinality as t(v, i)
       where btrim(t.v) <> ''
       order by t.i
    ),
    '{}'::text[]
  );

  if p_id is null then
    if p_slug is null or btrim(p_slug) = '' then
      raise exception 'Falta el identificador (slug) del deporte.'
        using errcode = 'check_violation';
    end if;

    insert into public.deporte (slug, nombre, categoria, descripcion, puntos, pie, orden, activo)
    values (
      btrim(p_slug), btrim(p_nombre), coalesce(btrim(p_categoria), ''),
      coalesce(btrim(p_descripcion), ''), v_puntos, coalesce(btrim(p_pie), ''), coalesce(p_orden, 0),
      false
    )
    returning * into v_fila;
  else
    select slug into v_slug from public.deporte where id = p_id for update;

    if not found then
      raise exception 'El deporte % no existe.', p_id
        using errcode = 'foreign_key_violation';
    end if;

    if p_slug is not null and btrim(p_slug) <> v_slug then
      raise exception 'El identificador de un deporte no se puede cambiar: rompería los enlaces existentes.'
        using errcode = 'check_violation';
    end if;

    update public.deporte
       set nombre      = btrim(p_nombre),
           categoria   = coalesce(btrim(p_categoria), ''),
           descripcion = coalesce(btrim(p_descripcion), ''),
           puntos      = v_puntos,
           pie         = coalesce(btrim(p_pie), ''),
           orden       = coalesce(p_orden, 0)
     where id = p_id
    returning * into v_fila;
  end if;

  return v_fila;
end;
$$;

comment on function public.guardar_deporte(uuid, uuid, text, text, text, text, text[], text, integer) is
  'Crea (nace DESACTIVADO) o actualiza un deporte. Reemplazo total del formulario. activo e imagen_path quedan fuera (alternar_deporte_activo, establecer_imagen_deporte). El slug es inmutable tras crear.';
