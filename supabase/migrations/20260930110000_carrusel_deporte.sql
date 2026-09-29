-- ---------------------------------------------------------------------------
-- TSW — 23. Etiqueta de deporte en las diapositivas del carrusel
--
-- Depende de la 22 (tabla deporte). Va en archivo aparte para poder revertirla
-- sin tocar los deportes.
--
-- Cada diapositiva puede llevar, opcionalmente, un deporte. Si ese deporte se
-- desactiva, la diapositiva deja de verse en público sin borrarla. Sin
-- deporte_id, se comporta como hasta ahora.
--
-- --- ON DELETE RESTRICT y no SET NULL -----------------------------------------
--
-- Con SET NULL, borrar un deporte (no hay RPC para ello, pero un DELETE manual
-- es posible) dejaría sus diapositivas sin etiqueta, y una diapositiva sin
-- etiqueta SE MUESTRA: la que estaba oculta porque su deporte estaba inactivo
-- reaparecería en público. Con RESTRICT el borrado falla y no hay sorpresas.
-- ---------------------------------------------------------------------------

alter table public.carrusel_slide add column deporte_id uuid;

alter table public.carrusel_slide
  add constraint carrusel_slide_deporte_fk
  foreign key (deporte_id) references public.deporte (id) on delete restrict;

comment on column public.carrusel_slide.deporte_id is
  'Deporte con el que se etiqueta la diapositiva. Nulo = sin deporte (siempre visible si está activa). Si el deporte está inactivo, la diapositiva no se ve en público.';

create index carrusel_slide_deporte_idx
  on public.carrusel_slide (deporte_id)
  where deporte_id is not null;

-- ---------------------------------------------------------------------------
-- RLS — se reemplazan las dos políticas de lectura de la 21. La de escritura
-- (carrusel_slide_escritura_admin) no cambia.
--
-- La subconsulta a `deporte` se evalúa con los permisos de quien lee, no con
-- los del dueño de la política: anon ya puede leer deporte (activo) y no hace
-- falta security definer ni permisos nuevos. `d.activo` es redundante con la
-- RLS de deporte y se deja explícito: si esa política cambia, esta no se
-- abre sola.
-- ---------------------------------------------------------------------------

drop policy carrusel_slide_lectura_publica on public.carrusel_slide;
drop policy carrusel_slide_lectura_sesion  on public.carrusel_slide;

create policy carrusel_slide_lectura_publica on public.carrusel_slide
  for select to anon
  using (
    activo
    and (
      deporte_id is null
      or exists (
        select 1 from public.deporte d
         where d.id = carrusel_slide.deporte_id and d.activo
      )
    )
  );

comment on policy carrusel_slide_lectura_publica on public.carrusel_slide is
  'El visitante ve las diapositivas activas cuyo deporte, si tienen, también está activo. No menciona es_admin(): anon no tiene EXECUTE sobre esa función.';

create policy carrusel_slide_lectura_sesion on public.carrusel_slide
  for select to authenticated
  using (
    (
      activo
      and (
        deporte_id is null
        or exists (
          select 1 from public.deporte d
           where d.id = carrusel_slide.deporte_id and d.activo
        )
      )
    )
    or public.es_admin()
  );

comment on policy carrusel_slide_lectura_sesion on public.carrusel_slide is
  'Con sesión: lo mismo que el visitante, y todas para el administrador, que necesita ver en el panel las desactivadas y las ocultas por su deporte.';

-- ---------------------------------------------------------------------------
-- guardar_slide_carrusel — gana p_deporte_id.
--
-- Se elimina la firma vieja de 8 parámetros: si conviviera con la nueva,
-- PostgREST respondería PGRST203 (ambigüedad) a cualquier llamada que no
-- mande p_deporte_id.
--
-- Reemplazo total: p_deporte_id null QUITA la etiqueta. La Server Action debe
-- mandarlo SIEMPRE; el tipo generado lo marcará opcional por tener default y
-- verificar:parametros no lo detecta.
-- ---------------------------------------------------------------------------

drop function public.guardar_slide_carrusel(uuid, uuid, integer, text, text, text, text, boolean);

create or replace function public.guardar_slide_carrusel(
  p_actor_id        uuid,
  p_id              uuid    default null,
  p_orden           integer default 0,
  p_titulo          text    default null,
  p_descripcion     text    default null,
  p_etiqueta_enlace text    default null,
  p_destino_enlace  text    default null,
  p_activo          boolean default true,
  p_deporte_id      uuid    default null
)
returns public.carrusel_slide
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fila        public.carrusel_slide;
  v_imagen_path text;
begin
  perform public.establecer_actor(p_actor_id);

  if p_titulo is null or btrim(p_titulo) = '' then
    raise exception 'Falta el título de la diapositiva.'
      using errcode = 'check_violation';
  end if;

  -- Mensaje propio en vez del genérico de la FK. Un deporte inactivo SÍ se
  -- puede asignar: la diapositiva simplemente no se verá mientras lo esté.
  if p_deporte_id is not null
     and not exists (select 1 from public.deporte where id = p_deporte_id) then
    raise exception 'El deporte % no existe.', p_deporte_id
      using errcode = 'foreign_key_violation';
  end if;

  if p_id is null then
    -- imagen_path SIEMPRE es null en una fila nueva: se sube después, por
    -- establecer_imagen_slide_carrusel. Si p_activo llega true (es el default)
    -- se fuerza a false: el admin la activa una vez subida la imagen.
    insert into public.carrusel_slide (orden, titulo, descripcion, etiqueta_enlace, destino_enlace, activo, deporte_id)
    values (
      coalesce(p_orden, 0), p_titulo, nullif(btrim(p_descripcion), ''),
      nullif(btrim(p_etiqueta_enlace), ''), nullif(btrim(p_destino_enlace), ''), false, p_deporte_id
    )
    returning * into v_fila;
  else
    select imagen_path into v_imagen_path from public.carrusel_slide where id = p_id for update;

    if not found then
      raise exception 'La diapositiva % no existe.', p_id
        using errcode = 'foreign_key_violation';
    end if;

    if coalesce(p_activo, true) and v_imagen_path is null then
      raise exception 'No se puede activar una diapositiva sin imagen.'
        using errcode = 'check_violation';
    end if;

    -- Reemplazo total, sin coalesce en el resto. imagen_path no se toca aquí.
    update public.carrusel_slide
       set orden           = coalesce(p_orden, 0),
           titulo          = p_titulo,
           descripcion     = nullif(btrim(p_descripcion), ''),
           etiqueta_enlace = nullif(btrim(p_etiqueta_enlace), ''),
           destino_enlace  = nullif(btrim(p_destino_enlace), ''),
           activo          = coalesce(p_activo, true),
           deporte_id      = p_deporte_id
     where id = p_id
    returning * into v_fila;
  end if;

  return v_fila;
end;
$$;

comment on function public.guardar_slide_carrusel(uuid, uuid, integer, text, text, text, text, boolean, uuid) is
  'Crea o actualiza una diapositiva del carrusel. Reemplazo total del formulario, incluido deporte_id (null quita la etiqueta): la acción debe mandarlo siempre. activo entra aquí; imagen_path no. No se puede activar sin imagen.';

revoke execute on function public.guardar_slide_carrusel(uuid, uuid, integer, text, text, text, text, boolean, uuid) from public, anon, authenticated;
grant  execute on function public.guardar_slide_carrusel(uuid, uuid, integer, text, text, text, text, boolean, uuid) to service_role;
