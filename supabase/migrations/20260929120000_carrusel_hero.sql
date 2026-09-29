-- ---------------------------------------------------------------------------
-- TSW — 21. Carrusel editable de la portada
--
-- El carrusel del hero existe como primitivo (`src/components/ui/Carrusel.tsx`)
-- desde el rediseño que lo retiró de la portada: scroll-snap nativo, flechas,
-- indicadores, pausa visible y swipe, todo ya resuelto. Esta migración NO toca
-- ese componente: solo le da datos editables desde el panel. `Carrusel` sigue
-- sin saber qué hay dentro de cada diapositiva, así que sirve igual aquí.
--
-- Tabla propia y no una clave más de `contenido_sitio` (migración 19): esa
-- tabla es clave/valor de secciones sueltas y no tiene ni reordenamiento ni
-- activar/desactivar por fila, que es justo lo que un carrusel necesita.
-- ---------------------------------------------------------------------------

create table public.carrusel_slide (
  id                uuid primary key default gen_random_uuid(),
  orden             integer not null default 0,
  imagen_path       text,
  titulo            text not null,
  descripcion       text,
  etiqueta_enlace   text,
  destino_enlace    text,
  activo            boolean not null default true,
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now(),

  constraint carrusel_slide_titulo_no_vacio check (length(btrim(titulo)) > 0),
  -- Ruta interna (/semilleros) o ancla (#seccion). Nunca una URL externa: el
  -- carrusel es de la portada propia, no un espacio de publicidad de terceros.
  constraint carrusel_slide_destino_formato check (
    destino_enlace is null or destino_enlace ~ '^(/[a-z0-9/_-]*|#[a-z0-9-]+)$'
  )
);

comment on table public.carrusel_slide is
  'Diapositivas del carrusel de la portada. orden decide la posición; activo, si se muestra. El componente que las pinta es Carrusel (src/components/ui/Carrusel.tsx), sin cambios.';
comment on column public.carrusel_slide.imagen_path is
  'Ruta en el bucket sitio, carpeta carrusel/. Nulo mientras no se haya subido: la diapositiva no se activa sin imagen (ver CHECK más abajo).';
comment on column public.carrusel_slide.etiqueta_enlace is
  'Texto del botón, ej. "Ver semilleros". Nulo = la diapositiva no lleva botón.';
comment on column public.carrusel_slide.destino_enlace is
  'Ruta interna o ancla. Obligatorio si hay etiqueta_enlace: un botón sin destino no es un botón.';

alter table public.carrusel_slide
  add constraint carrusel_slide_enlace_completo check (
    (etiqueta_enlace is null) = (destino_enlace is null)
  );

comment on constraint carrusel_slide_enlace_completo on public.carrusel_slide is
  'Las dos mitades del botón van juntas o ninguna: un texto sin destino, o un destino sin texto, no se puede renderizar.';

-- El comentario de imagen_path (arriba) promete este CHECK: sin él,
-- guardar_slide_carrusel podía crear/actualizar un slide con activo = true e
-- imagen_path null (el default de p_activo es true), y la lectura pública lo
-- mostraría sin imagen de fondo.
alter table public.carrusel_slide
  add constraint carrusel_slide_no_activo_sin_imagen check (
    not activo or imagen_path is not null
  );

comment on constraint carrusel_slide_no_activo_sin_imagen on public.carrusel_slide is
  'Una diapositiva sin imagen no puede estar activa. guardar_slide_carrusel la fuerza a false en la creación (imagen_path siempre es null en un INSERT) y rechaza con mensaje propio el intento de activar una fila existente que sigue sin imagen.';

create trigger carrusel_slide_actualizado_en
  before update on public.carrusel_slide
  for each row execute function public.set_actualizado_en();

create trigger carrusel_slide_auditoria
  after insert or update or delete on public.carrusel_slide
  for each row execute function public.registrar_auditoria();

create index carrusel_slide_activo_orden_idx
  on public.carrusel_slide (orden)
  where activo;

comment on index public.carrusel_slide_activo_orden_idx is
  'Lectura pública: solo las diapositivas activas, en su orden.';

-- ---------------------------------------------------------------------------
-- RLS — mismo patrón que club (migraciones 17 y 18): una política por rol,
-- ninguna mezcla `to anon` con `es_admin()` en la misma expresión (anon no
-- tiene EXECUTE sobre esa función, y evaluarla ahí tumba el sitio entero).
-- ---------------------------------------------------------------------------

alter table public.carrusel_slide enable row level security;

create policy carrusel_slide_lectura_publica on public.carrusel_slide
  for select to anon
  using (activo);

comment on policy carrusel_slide_lectura_publica on public.carrusel_slide is
  'El visitante ve solo las diapositivas activas. No menciona es_admin(): anon no tiene EXECUTE sobre esa función.';

create policy carrusel_slide_lectura_sesion on public.carrusel_slide
  for select to authenticated
  using (activo or public.es_admin());

comment on policy carrusel_slide_lectura_sesion on public.carrusel_slide is
  'Con sesión: los activos para cualquiera, y todos para el administrador, que necesita ver los desactivados en el panel.';

create policy carrusel_slide_escritura_admin on public.carrusel_slide
  for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ---------------------------------------------------------------------------
-- guardar_slide_carrusel — upsert, reemplazo total del formulario.
--
-- p_activo SÍ entra aquí, al revés que club/producto/competencia: sigue el
-- precedente de guardar_nivel, no el de destacar/publicar. Un slide es una
-- fila de lista con un interruptor simple, sin efectos secundarios sobre
-- otras filas (a diferencia de "destacar", que desmarca la anterior) ni
-- reglas de negocio propias (a diferencia de "publicar"), así que no necesita
-- su propia RPC. imagen_path SÍ queda fuera: mismo motivo que en club y
-- producto, único camino por establecer_imagen_slide_carrusel.
-- ---------------------------------------------------------------------------

create or replace function public.guardar_slide_carrusel(
  p_actor_id        uuid,
  p_id              uuid    default null,
  p_orden           integer default 0,
  p_titulo          text    default null,
  p_descripcion     text    default null,
  p_etiqueta_enlace text    default null,
  p_destino_enlace  text    default null,
  p_activo          boolean default true
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

  if p_id is null then
    -- imagen_path SIEMPRE es null en una fila nueva: se sube después, por
    -- establecer_imagen_slide_carrusel. Si p_activo llega true de todos modos
    -- (es el default), se fuerza a false en vez de fallar: el admin la activa
    -- desde el panel una vez subida la imagen. No es un error del formulario.
    insert into public.carrusel_slide (orden, titulo, descripcion, etiqueta_enlace, destino_enlace, activo)
    values (
      coalesce(p_orden, 0), p_titulo, nullif(btrim(p_descripcion), ''),
      nullif(btrim(p_etiqueta_enlace), ''), nullif(btrim(p_destino_enlace), ''), false
    )
    returning * into v_fila;
  else
    -- Bloquea la fila y trae su imagen_path actual: esta función no lo toca,
    -- pero necesita conocerlo para decidir si activar es válido.
    select imagen_path into v_imagen_path from public.carrusel_slide where id = p_id for update;

    if not found then
      raise exception 'La diapositiva % no existe.', p_id
        using errcode = 'foreign_key_violation';
    end if;

    -- Ya hubo oportunidad de subir la imagen (a diferencia de la creación):
    -- activar una fila que sigue sin ella es un error del panel, con mensaje
    -- propio en vez del genérico del CHECK carrusel_slide_no_activo_sin_imagen.
    if coalesce(p_activo, true) and v_imagen_path is null then
      raise exception 'No se puede activar una diapositiva sin imagen.'
        using errcode = 'check_violation';
    end if;

    -- Reemplazo total, sin coalesce en el resto: el formulario es el estado
    -- completo de la fila. imagen_path no está en esta lista de columnas: no
    -- cambia aquí.
    update public.carrusel_slide
       set orden           = coalesce(p_orden, 0),
           titulo          = p_titulo,
           descripcion     = nullif(btrim(p_descripcion), ''),
           etiqueta_enlace = nullif(btrim(p_etiqueta_enlace), ''),
           destino_enlace  = nullif(btrim(p_destino_enlace), ''),
           activo          = coalesce(p_activo, true)
     where id = p_id
    returning * into v_fila;
  end if;

  return v_fila;
end;
$$;

comment on function public.guardar_slide_carrusel(uuid, uuid, integer, text, text, text, text, boolean) is
  'Crea o actualiza una diapositiva del carrusel. Reemplazo total del formulario: activo entra aquí (patrón de guardar_nivel), imagen_path no (patrón de guardar_club/guardar_producto). No se puede activar sin imagen: en la creación se fuerza a false; en la edición, si sigue sin imagen, se rechaza con mensaje propio.';

revoke execute on function public.guardar_slide_carrusel(uuid, uuid, integer, text, text, text, text, boolean) from public, anon, authenticated;
grant  execute on function public.guardar_slide_carrusel(uuid, uuid, integer, text, text, text, text, boolean) to service_role;

-- --- establecer_imagen_slide_carrusel ---------------------------------------

create or replace function public.establecer_imagen_slide_carrusel(
  p_actor_id    uuid,
  p_id          uuid,
  p_imagen_path text
)
returns public.carrusel_slide
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fila public.carrusel_slide;
begin
  perform public.establecer_actor(p_actor_id);

  update public.carrusel_slide set imagen_path = nullif(btrim(p_imagen_path), '') where id = p_id
  returning * into v_fila;

  if not found then
    raise exception 'La diapositiva % no existe.', p_id
      using errcode = 'foreign_key_violation';
  end if;

  return v_fila;
end;
$$;

comment on function public.establecer_imagen_slide_carrusel(uuid, uuid, text) is
  'Único camino por el que cambia la imagen de una diapositiva. Mismo principio que establecer_logo_club: si entrara por dos caminos, cada uno necesitaría su copia de las reglas.';

revoke execute on function public.establecer_imagen_slide_carrusel(uuid, uuid, text) from public, anon, authenticated;
grant  execute on function public.establecer_imagen_slide_carrusel(uuid, uuid, text) to service_role;

-- --- eliminar_slide_carrusel -------------------------------------------------
--
-- Borrado real, no desactivación: al revés que club o producto, un slide no
-- tiene FKs colgando (nada referencia carrusel_slide.id) y no hay histórico
-- que proteger. Es contenido editorial de portada, no un registro de negocio.

create or replace function public.eliminar_slide_carrusel(
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

  delete from public.carrusel_slide where id = p_id;

  if not found then
    raise exception 'La diapositiva % no existe.', p_id
      using errcode = 'foreign_key_violation';
  end if;
end;
$$;

comment on function public.eliminar_slide_carrusel(uuid, uuid) is
  'Borra una diapositiva. El archivo de Storage, si tenía, no se borra con ella: mismo criterio que las fotos reemplazadas de productos y competencias.';

revoke execute on function public.eliminar_slide_carrusel(uuid, uuid) from public, anon, authenticated;
grant  execute on function public.eliminar_slide_carrusel(uuid, uuid) to service_role;

-- --- reordenar_slides_carrusel -----------------------------------------------
--
-- Mismo patrón que reordenar_niveles (migración 17), sin el club_id: aquí la
-- lista es una sola, no una por grupo.

create or replace function public.reordenar_slides_carrusel(
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
begin
  perform public.establecer_actor(p_actor_id);

  -- Bloqueo de la tabla ENTERA antes de cualquier lectura: select ... for
  -- update no impide un INSERT concurrente, y las comprobaciones de abajo
  -- tienen que ver el mismo conjunto que se va a reescribir.
  lock table public.carrusel_slide in share row exclusive mode;

  if array_length(p_ids, 1) is null then
    raise exception 'La lista de diapositivas está vacía.'
      using errcode = 'check_violation';
  end if;

  if (select count(*) from unnest(p_ids) u) <> (select count(distinct u) from unnest(p_ids) u) then
    raise exception 'La lista de diapositivas tiene ids repetidos.'
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1
      from unnest(p_ids) as u(id)
     where not exists (select 1 from public.carrusel_slide s where s.id = u.id)
  ) then
    raise exception 'Alguna diapositiva de la lista ya no existe. Recarga la página e inténtalo de nuevo.'
      using errcode = 'foreign_key_violation';
  end if;

  select count(*) into v_total from public.carrusel_slide;

  if v_total <> array_length(p_ids, 1) then
    raise exception 'La lista debe incluir todas las diapositivas (hay % y llegaron %). Recarga la página e inténtalo de nuevo.',
      v_total, array_length(p_ids, 1)
      using errcode = 'check_violation';
  end if;

  -- UN SOLO UPDATE, y no el paso-por-negativos de reordenar_niveles: ese
  -- patrón existe ahí para no chocar con nivel_orden_unico (club_id, orden)
  -- mientras la reasignación está a medias. carrusel_slide.orden no tiene
  -- constraint único —el índice parcial de arriba es solo para la lectura
  -- pública activa, no para unicidad—, así que no hay nada con lo que chocar
  -- y el paso intermedio por negativos no aporta nada aquí.
  update public.carrusel_slide s
     set orden = ordenado.posicion
    from unnest(p_ids) with ordinality as ordenado(id, posicion)
   where s.id = ordenado.id;
end;
$$;

comment on function public.reordenar_slides_carrusel(uuid, uuid[]) is
  'Reordena todas las diapositivas según la posición de cada id en el arreglo, en una sola transacción. Un solo UPDATE: a diferencia de nivel, orden no tiene constraint único, así que no hace falta el paso intermedio por valores negativos. Exige el conjunto completo: no reordena parcialidades.';

revoke execute on function public.reordenar_slides_carrusel(uuid, uuid[]) from public, anon, authenticated;
grant  execute on function public.reordenar_slides_carrusel(uuid, uuid[]) to service_role;
