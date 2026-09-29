-- ---------------------------------------------------------------------------
-- TSW — 22. Tabla `deporte`
--
-- Hasta aquí los deportes vivían como un arreglo JSON dentro de
-- `contenido_sitio` (clave 'deportes', migración 19): sin identidad propia, sin
-- estado activo/inactivo y sin poder ser referenciados por otra tabla.
-- `deporte-publico.ts` lo decía: el selector público se queda apagado "hasta
-- que exista la tabla deporte".
--
-- --- Decisiones ---------------------------------------------------------------
--
-- * `id` uuid + `slug` único. El uuid es la llave que otras tablas
--   referenciarán (carrusel_slide en la 23; club.deporte_id más adelante). El
--   slug es lo que va en la URL (`/semilleros?deporte=bmx`) y es el `id` que
--   tenía cada elemento del JSON, así que los enlaces existentes no se rompen.
--   Es inmutable tras crear: cambiarlo rompería enlaces (guardar_deporte).
-- * `nombre` único sin distinguir mayúsculas: habilita el backfill futuro de
--   club.deporte_id cruzando por nombre ("BMX" -> este deporte).
-- * `puntos` es text[]: lista corta y ordenada que se edita entera y nunca se
--   consulta por ítem. Una tabla aparte costaría otra RLS y otra RPC sin ganar
--   nada.
-- * `imagen_path` acepta una ruta del bucket `sitio` o una ruta local
--   (/imagenes/...): es lo que ya traía el JSON y resolverImagenSitio() entiende
--   las dos.
-- * NO hay eliminar_deporte. Un deporte tendrá slides y, luego, clubes
--   colgando: se desactiva, igual que club y producto.
-- * NO se conecta club.deporte_id todavía. Es un paso aparte.
-- * La fila 'deportes' de contenido_sitio NO se toca: queda como respaldo de
--   reversa, sin lectores. Una migración posterior la borra.
-- ---------------------------------------------------------------------------

create table public.deporte (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null,
  nombre          text not null,
  categoria       text not null default '',
  descripcion     text not null default '',
  puntos          text[] not null default '{}',
  pie             text not null default '',
  imagen_path     text,
  orden           integer not null default 0,
  activo          boolean not null default true,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),

  constraint deporte_slug_unico unique (slug),
  constraint deporte_slug_formato check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint deporte_nombre_no_vacio check (length(btrim(nombre)) > 0)
);

-- Índice único y no constraint: una expresión no cabe en un UNIQUE de tabla.
-- Postgres lo reporta con el mismo texto ("violates unique constraint").
create unique index deporte_nombre_unico on public.deporte (lower(btrim(nombre)));

comment on table public.deporte is
  'Deporte de la corporación. Sale de contenido_sitio (clave deportes) en la migración 22. Se desactiva, no se borra: lo referencian diapositivas del carrusel y, más adelante, clubes.';
comment on column public.deporte.slug is
  'Identificador de URL (?deporte=bmx). Inmutable tras crear; era el id de cada elemento del JSON original.';
comment on column public.deporte.puntos is
  'Puntos destacados de la tarjeta, en orden. Lista corta editada entera.';
comment on column public.deporte.imagen_path is
  'Ruta en el bucket sitio (sitio/<uuid>.ext) o ruta local (/imagenes/...). Único camino de cambio: establecer_imagen_deporte.';
comment on column public.deporte.orden is
  'Posición en las listas, menor primero. No es único.';
comment on column public.deporte.activo is
  'Falso = oculto del sitio público, del selector público y de las diapositivas etiquetadas con él. Solo cambia por alternar_deporte_activo, que impide desactivar el último.';

create trigger deporte_actualizado_en
  before update on public.deporte
  for each row execute function public.set_actualizado_en();

create trigger deporte_auditoria
  after insert or update or delete on public.deporte
  for each row execute function public.registrar_auditoria();

create index deporte_activo_orden_idx
  on public.deporte (orden)
  where activo;

comment on index public.deporte_activo_orden_idx is
  'Lectura pública: solo los deportes activos, en su orden.';

-- ---------------------------------------------------------------------------
-- RLS — mismo patrón que carrusel_slide: una política por rol, ninguna mezcla
-- `to anon` con es_admin() (anon no tiene EXECUTE sobre esa función).
-- ---------------------------------------------------------------------------

alter table public.deporte enable row level security;

create policy deporte_lectura_publica on public.deporte
  for select to anon
  using (activo);

comment on policy deporte_lectura_publica on public.deporte is
  'El visitante ve solo los deportes activos. No menciona es_admin(): anon no tiene EXECUTE sobre esa función.';

create policy deporte_lectura_sesion on public.deporte
  for select to authenticated
  using (activo or public.es_admin());

comment on policy deporte_lectura_sesion on public.deporte is
  'Con sesión: los activos para cualquiera, y todos para el administrador, que necesita ver los desactivados en el panel.';

create policy deporte_escritura_admin on public.deporte
  for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ---------------------------------------------------------------------------
-- Migración de datos
--
-- 1) Desde contenido_sitio (clave 'deportes'), si la fila existe y es una
--    lista. El `id` del JSON pasa a `slug`; la posición en la lista, a `orden`;
--    `imagen` pasa a `imagen_path` SIN copiar archivos (misma ruta: nada queda
--    huérfano ni se borra en Storage). El trigger de auditoría se dispara con
--    actor NULL, igual que la semilla de club (migración 17).
-- ---------------------------------------------------------------------------

insert into public.deporte (slug, nombre, categoria, descripcion, puntos, pie, imagen_path, orden)
select
  e.elemento ->> 'id',
  coalesce(nullif(btrim(e.elemento ->> 'nombre'), ''), e.elemento ->> 'id'),
  coalesce(e.elemento ->> 'categoria', ''),
  coalesce(e.elemento ->> 'descripcion', ''),
  case
    when jsonb_typeof(e.elemento -> 'puntos') = 'array' then
      array(
        select t.v
          from jsonb_array_elements_text(e.elemento -> 'puntos') with ordinality as t(v, i)
         order by t.i
      )
    else '{}'::text[]
  end,
  coalesce(e.elemento ->> 'pie', ''),
  nullif(btrim(e.elemento ->> 'imagen'), ''),
  (e.posicion - 1)::integer
from public.contenido_sitio c
cross join lateral jsonb_array_elements(c.valor) with ordinality as e(elemento, posicion)
where c.clave = 'deportes'
  and jsonb_typeof(c.valor) = 'array';

-- 2) Respaldo de fábrica, solo si el paso 1 no dejó nada (base recién creada
--    con `db reset`, o fila ausente). Es copia puntual de DEPORTES en
--    src/config/contenido.ts: la duplicación se acepta porque la tabla no puede
--    quedar vacía (la regla del último activo la da por supuesta). Desde aquí,
--    ese arreglo del código es solo el respaldo de lectura si la consulta falla.
insert into public.deporte (slug, nombre, categoria, descripcion, puntos, pie, imagen_path, orden)
select v.*
  from (
    values
      ('bmx', 'BMX', '[Semilleros y competencia]',
       '[Presentación del BMX en la corporación: a quién va dirigido y qué ofrece.]',
       array['[Punto destacado 1]', '[Punto destacado 2]'], '[Cupos por semestre]',
       '/imagenes/escuela.jpg', 0),
      ('deporte-2', '[DEPORTE 2]', '[Categoría del deporte]',
       '[Presentación del deporte: a quién va dirigido y qué ofrece.]',
       array['[Punto destacado 1]', '[Punto destacado 2]'], '[Cupos por semestre]',
       null, 1)
  ) as v(slug, nombre, categoria, descripcion, puntos, pie, imagen_path, orden)
 where not exists (select 1 from public.deporte);

-- 3) Comprobación dentro de la transacción: si la fila existía, la tabla tiene
--    tantas filas como elementos tenía el JSON. Si no cuadra, la migración
--    entera se deshace.
do $$
declare
  v_esperados integer;
  v_reales    integer;
begin
  select jsonb_array_length(valor) into v_esperados
    from public.contenido_sitio
   where clave = 'deportes' and jsonb_typeof(valor) = 'array';

  select count(*) into v_reales from public.deporte;

  if v_esperados is not null and v_esperados <> v_reales then
    raise exception 'Migración 22: el JSON tenía % deportes y la tabla quedó con %.', v_esperados, v_reales;
  end if;

  if v_reales = 0 then
    raise exception 'Migración 22: la tabla deporte quedó vacía.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- guardar_deporte — reemplazo total del formulario.
--
-- Quedan FUERA: activo (alternar_deporte_activo, que tiene reglas propias) e
-- imagen_path (establecer_imagen_deporte, único camino). Mismo contrato que
-- guardar_club.
--
-- p_nombre es obligatorio de hecho aunque tenga default: el cuerpo lo exige.
-- p_slug solo es obligatorio al crear; al editar se ignora si coincide y se
-- rechaza si difiere. La interfaz de esta fase no crea deportes, pero la RPC
-- lo soporta.
-- ---------------------------------------------------------------------------

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

  -- Sin ítems vacíos y en el mismo orden en que llegaron.
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

    insert into public.deporte (slug, nombre, categoria, descripcion, puntos, pie, orden)
    values (
      btrim(p_slug), btrim(p_nombre), coalesce(btrim(p_categoria), ''),
      coalesce(btrim(p_descripcion), ''), v_puntos, coalesce(btrim(p_pie), ''), coalesce(p_orden, 0)
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
  'Crea o actualiza un deporte. Reemplazo total del formulario. activo e imagen_path quedan fuera (alternar_deporte_activo, establecer_imagen_deporte). El slug es inmutable tras crear.';

revoke execute on function public.guardar_deporte(uuid, uuid, text, text, text, text, text[], text, integer) from public, anon, authenticated;
grant  execute on function public.guardar_deporte(uuid, uuid, text, text, text, text, text[], text, integer) to service_role;

-- --- establecer_imagen_deporte ---------------------------------------------

create or replace function public.establecer_imagen_deporte(
  p_actor_id    uuid,
  p_id          uuid,
  p_imagen_path text
)
returns public.deporte
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fila public.deporte;
begin
  perform public.establecer_actor(p_actor_id);

  update public.deporte set imagen_path = nullif(btrim(p_imagen_path), '') where id = p_id
  returning * into v_fila;

  if not found then
    raise exception 'El deporte % no existe.', p_id
      using errcode = 'foreign_key_violation';
  end if;

  return v_fila;
end;
$$;

comment on function public.establecer_imagen_deporte(uuid, uuid, text) is
  'Único camino por el que cambia la imagen de un deporte. Mismo principio que establecer_logo_club.';

revoke execute on function public.establecer_imagen_deporte(uuid, uuid, text) from public, anon, authenticated;
grant  execute on function public.establecer_imagen_deporte(uuid, uuid, text) to service_role;

-- --- alternar_deporte_activo --------------------------------------------------
--
-- Valida contra el CONJUNTO de filas (¿queda algún otro activo?), así que
-- bloquea la tabla entera como primera sentencia tras establecer_actor y antes
-- de cualquier lectura: `for update` bloquea filas existentes pero no impide
-- que una segunda sesión desactive OTRO deporte al mismo tiempo, y las dos
-- verían "queda uno" y dejarían el sitio sin ninguno.
--
-- La regla vive solo aquí: el panel nunca escribe directo a la tabla.

create or replace function public.alternar_deporte_activo(
  p_actor_id uuid,
  p_id       uuid,
  p_activo   boolean
)
returns public.deporte
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fila public.deporte;
begin
  perform public.establecer_actor(p_actor_id);

  lock table public.deporte in share row exclusive mode;

  if p_activo is null then
    raise exception 'Falta indicar si el deporte queda activo o inactivo.'
      using errcode = 'null_value_not_allowed';
  end if;

  select * into v_fila from public.deporte where id = p_id;

  if not found then
    raise exception 'El deporte % no existe.', p_id
      using errcode = 'foreign_key_violation';
  end if;

  -- Ya está como se pide: no es un error y no genera evento de bitácora.
  if v_fila.activo = p_activo then
    return v_fila;
  end if;

  if not p_activo
     and not exists (select 1 from public.deporte where activo and id <> p_id) then
    raise exception 'No se puede desactivar el último deporte activo: el sitio necesita al menos uno.'
      using errcode = 'check_violation';
  end if;

  update public.deporte set activo = p_activo where id = p_id
  returning * into v_fila;

  return v_fila;
end;
$$;

comment on function public.alternar_deporte_activo(uuid, uuid, boolean) is
  'Muestra u oculta un deporte del sitio público y de las diapositivas etiquetadas con él. Rechaza desactivar el último activo. lock table en share row exclusive antes de leer: la regla cuenta filas.';

revoke execute on function public.alternar_deporte_activo(uuid, uuid, boolean) from public, anon, authenticated;
grant  execute on function public.alternar_deporte_activo(uuid, uuid, boolean) to service_role;
