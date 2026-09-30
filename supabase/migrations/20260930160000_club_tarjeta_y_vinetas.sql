-- Clubes: texto de la tarjeta pequeña de la portada y viñetas de "Nuestros
-- clubes y programa" (docs/contenido-tsw-por-pagina.md, Página de inicio).
--
-- `etiqueta` y `descripcion` ya existen y son lo que el documento llama
-- "Etiqueta" y "Texto" de cada tarjeta; no se tocan. Faltaban dos cosas:
--   · subtitulo_tarjeta: el texto corto bajo el nombre en la tarjeta pequeña
--     del hero ("El club de la casa", "Formación por niveles"…). No es la
--     etiqueta: la de Mastercross es "Club acogido · Desde 2022".
--   · vinetas: hasta 4 puntos cortos por club.
--
-- guardar_club es reemplazo total: lleva los dos parámetros nuevos y la firma
-- vieja (11 parámetros) se ELIMINA. Dejar las dos convivir crearía una
-- sobrecarga ambigua para PostgREST (PGRST203), que es lo que pasó con
-- p_deporte_id en guardar_slide_carrusel (migración 23).

-- --- Columnas ---------------------------------------------------------------

alter table public.club
  add column subtitulo_tarjeta text,
  add column vinetas text[] not null default '{}';

-- Sin elementos vacíos ni nulos y con un máximo de 4. `array_position(…, '')`
-- y `array_position(…, null)` devuelven null cuando el valor no está.
alter table public.club
  add constraint club_vinetas_maximo
    check (cardinality(vinetas) <= 4),
  add constraint club_vinetas_sin_vacias
    check (array_position(vinetas, '') is null and array_position(vinetas, null) is null),
  add constraint club_subtitulo_tarjeta_no_vacio
    check (subtitulo_tarjeta is null or length(btrim(subtitulo_tarjeta)) > 0);

comment on column public.club.subtitulo_tarjeta is
  'Texto corto bajo el nombre del club en la tarjeta pequeña de la portada. Nulo = la tarjeta no lleva subtítulo.';
comment on column public.club.vinetas is
  'Hasta 4 puntos cortos para la tarjeta de "Nuestros clubes y programa". Sin vacíos ni nulos (lo garantizan los CHECK).';

-- --- guardar_club -----------------------------------------------------------

drop function public.guardar_club(uuid, uuid, text, text, text, text, text, text, text, text, integer);

create or replace function public.guardar_club(
  p_actor_id          uuid,
  p_id                uuid    default null,
  p_nombre            text    default null,
  p_slug              text    default null,
  p_tipo              text    default 'club',
  p_deporte           text    default null,
  p_etiqueta          text    default null,
  p_descripcion       text    default null,
  p_color_identidad   text    default null,
  p_instagram_url     text    default null,
  p_orden             integer default 0,
  p_subtitulo_tarjeta text    default null,
  p_vinetas           text[]  default '{}'
)
returns public.club
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fila public.club;
  -- Sin vacías ni espacios sobrantes; null se comporta como "sin viñetas".
  v_vinetas text[] := coalesce(
    array(select btrim(v) from unnest(p_vinetas) as v where v is not null and btrim(v) <> ''),
    '{}'
  );
begin
  perform public.establecer_actor(p_actor_id);

  if cardinality(v_vinetas) > 4 then
    raise exception 'Un club admite como máximo 4 viñetas.'
      using errcode = 'check_violation';
  end if;

  if p_id is null then
    insert into public.club (nombre, slug, tipo, deporte, etiqueta, descripcion, color_identidad, instagram_url, orden,
                             subtitulo_tarjeta, vinetas)
    values (p_nombre, p_slug, p_tipo, p_deporte, nullif(btrim(p_etiqueta), ''), nullif(btrim(p_descripcion), ''),
            nullif(btrim(p_color_identidad), ''), nullif(btrim(p_instagram_url), ''), coalesce(p_orden, 0),
            nullif(btrim(p_subtitulo_tarjeta), ''), v_vinetas)
    returning * into v_fila;
  else
    -- Reemplazo total, sin coalesce: el formulario es el estado completo de la
    -- fila. Con coalesce, vaciar un campo desde el panel no lo vaciaría.
    update public.club
       set nombre            = p_nombre,
           slug              = p_slug,
           tipo              = p_tipo,
           deporte           = p_deporte,
           etiqueta          = nullif(btrim(p_etiqueta), ''),
           descripcion       = nullif(btrim(p_descripcion), ''),
           color_identidad   = nullif(btrim(p_color_identidad), ''),
           instagram_url     = nullif(btrim(p_instagram_url), ''),
           orden             = coalesce(p_orden, 0),
           subtitulo_tarjeta = nullif(btrim(p_subtitulo_tarjeta), ''),
           vinetas           = v_vinetas
     where id = p_id
    returning * into v_fila;

    if not found then
      raise exception 'El club % no existe.', p_id
        using errcode = 'foreign_key_violation';
    end if;
  end if;

  return v_fila;
end;
$$;

comment on function public.guardar_club(uuid, uuid, text, text, text, text, text, text, text, text, integer, text, text[]) is
  'Crea o actualiza un club o programa. Reemplazo total: el formulario manda todos sus campos, incluidos subtitulo_tarjeta y vinetas (hasta 4). activo y logo_path quedan fuera, por alternar_club_activo y establecer_logo_club.';

revoke execute on function public.guardar_club(uuid, uuid, text, text, text, text, text, text, text, text, integer, text, text[]) from public, anon, authenticated;
grant  execute on function public.guardar_club(uuid, uuid, text, text, text, text, text, text, text, text, integer, text, text[]) to service_role;
