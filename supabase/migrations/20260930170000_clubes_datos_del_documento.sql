-- Datos de los tres clubes y de la bajada de «Nuestros clubes y programa», del
-- documento definitivo (docs/contenido-tsw-por-pagina.md, Página de inicio).
--
-- Se escriben solo subtitulo_tarjeta y vinetas de cada club, y
-- portada.deportesBajada. `etiqueta` y `descripcion` de los tres clubes YA
-- coinciden con el documento (comprobado en producción el 2026-09-30) y no se
-- tocan.
--
-- Guarda: cada club debe seguir con subtitulo_tarjeta nulo y sin viñetas (las
-- columnas son nuevas), y portada.deportesBajada debe seguir vacía. Si alguno
-- cambió, aborta sin escribir nada. Si ya tiene el valor del documento, se
-- salta. Sin actor: la bitácora registra actor_id NULL.
--
-- Se APLICA DESPUÉS de 20260930160000_club_tarjeta_y_vinetas.sql.

do $$
declare
  v_bajada constant text :=
    'La Corporación Deportiva TSW agrupa dos clubes de BMX, cada uno con su propia identidad, y un programa de habilidades motrices. Todos comparten escenarios, valores y un equipo de entrenadores ex atletas y licenciados en deporte.';

  v_datos constant jsonb := jsonb_build_array(
    jsonb_build_object(
      'slug', 'bmx-club-tsw',
      'subtitulo', 'El club de la casa',
      'vinetas', jsonb_build_array(
        'Todas las edades y niveles, desde la iniciación.',
        'Grupo competitivo en válidas regionales, departamentales y nacionales.')),
    jsonb_build_object(
      'slug', 'bmx-mastercross',
      'subtitulo', 'Formación por niveles',
      'vinetas', jsonb_build_array(
        'Formación por niveles de habilidad, para todas las edades.',
        'Entrena en las pistas Antonio Roldán Betancur y Mariana Pajón.')),
    jsonb_build_object(
      'slug', 'habilidades-motrices',
      'subtitulo', 'Personalizado, todas las edades',
      'vinetas', jsonb_build_array(
        'Atención personalizada, para todas las edades.',
        'Base motriz para el BMX y otros deportes.'))
  );

  v_dato jsonb;
  v_club public.club%rowtype;
  v_vinetas text[];
  v_portada jsonb;
begin
  -- 1. Comprobar todo ANTES de escribir nada.
  for v_dato in select * from jsonb_array_elements(v_datos) loop
    select * into v_club from public.club where slug = v_dato ->> 'slug' for update;
    if not found then
      raise exception 'No existe el club %. Se aborta sin escribir.', v_dato ->> 'slug';
    end if;

    v_vinetas := array(select jsonb_array_elements_text(v_dato -> 'vinetas'));

    if v_club.subtitulo_tarjeta is not distinct from (v_dato ->> 'subtitulo') and v_club.vinetas = v_vinetas then
      continue; -- ya está
    end if;
    if v_club.subtitulo_tarjeta is not null or cardinality(v_club.vinetas) > 0 then
      raise exception 'El club % ya tiene subtítulo o viñetas (subtítulo: %, viñetas: %). Se aborta sin escribir.',
        v_club.slug, v_club.subtitulo_tarjeta, v_club.vinetas;
    end if;
  end loop;

  select valor into v_portada from public.contenido_sitio where clave = 'portada' for update;
  if v_portada is null then
    raise exception 'No existe la fila portada en contenido_sitio. Se aborta sin escribir.';
  end if;
  if v_portada ->> 'deportesBajada' is distinct from v_bajada and coalesce(v_portada ->> 'deportesBajada', '') <> '' then
    raise exception 'portada.deportesBajada cambió desde la lectura (hoy: %). Se aborta sin escribir.', v_portada ->> 'deportesBajada';
  end if;

  -- 2. Escribir.
  for v_dato in select * from jsonb_array_elements(v_datos) loop
    update public.club
       set subtitulo_tarjeta = v_dato ->> 'subtitulo',
           vinetas = array(select jsonb_array_elements_text(v_dato -> 'vinetas'))
     where slug = v_dato ->> 'slug';
  end loop;

  if v_portada ->> 'deportesBajada' is distinct from v_bajada then
    update public.contenido_sitio
       set valor = jsonb_set(valor, '{deportesBajada}', to_jsonb(v_bajada))
     where clave = 'portada';
  end if;
end
$$;
