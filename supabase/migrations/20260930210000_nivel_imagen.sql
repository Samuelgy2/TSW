-- Imagen por nivel (/semilleros).
--
-- Mismo patrón que la foto de deporte (migración 22): la columna queda FUERA de
-- guardar_nivel y solo cambia por establecer_imagen_nivel. guardar_nivel ya
-- escribe columna por columna (no toca imagen_path), así que guardar el texto de
-- un nivel NO borra su imagen; no hace falta tocar su firma.
--
-- A diferencia de establecer_imagen_deporte, esta RPC valida la forma de la ruta:
-- el panel solo produce niveles/<uuid>.(jpg|png|webp), y una ruta distinta es un
-- camino de escritura que no debería existir.

do $$
begin
  if to_regclass('public.nivel') is null then
    raise exception 'Guarda: public.nivel no existe.';
  end if;
  if to_regprocedure('public.establecer_actor(uuid)') is null then
    raise exception 'Guarda: falta establecer_actor(uuid).';
  end if;
end
$$;

alter table public.nivel add column if not exists imagen_path text;

comment on column public.nivel.imagen_path is
  'Ruta en el bucket sitio (niveles/<uuid>.ext). Nulo = la tarjeta usa el marcador. Único camino de cambio: establecer_imagen_nivel.';

create or replace function public.establecer_imagen_nivel(
  p_actor_id    uuid,
  p_id          uuid,
  p_imagen_path text
)
returns public.nivel
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ruta text := nullif(btrim(p_imagen_path), '');
  v_fila public.nivel;
begin
  perform public.establecer_actor(p_actor_id);

  if v_ruta is not null and v_ruta !~ '^niveles/[0-9a-f-]{36}\.(jpg|png|webp)$' then
    raise exception 'La ruta de la imagen no es válida.'
      using errcode = 'check_violation';
  end if;

  update public.nivel set imagen_path = v_ruta where id = p_id
  returning * into v_fila;

  if not found then
    raise exception 'El nivel % no existe.', p_id
      using errcode = 'foreign_key_violation';
  end if;

  return v_fila;
end;
$$;

comment on function public.establecer_imagen_nivel(uuid, uuid, text) is
  'Único camino por el que cambia la imagen de un nivel. Cadena vacía o nula la quita. Mismo principio que establecer_imagen_deporte.';

revoke execute on function public.establecer_imagen_nivel(uuid, uuid, text) from public, anon, authenticated;
grant  execute on function public.establecer_imagen_nivel(uuid, uuid, text) to service_role;
