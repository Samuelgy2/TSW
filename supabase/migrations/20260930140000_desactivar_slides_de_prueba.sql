-- Desactiva las dos diapositivas de prueba de la portada ("prueba" e
-- "inscripciones"). Se APLICA DESPUÉS de 20260930130000_portada_hero_texto.sql
-- y de comprobar que la portada sin diapositivas no muestra ningún placeholder:
-- sin slides activos, el hero cae al título, la presentación y los botones fijos.
--
-- Solo desactiva (activo = false); no borra filas ni imágenes. Antes de
-- escribir comprueba que cada fila sigue siendo la que se leyó (mismo título y
-- activa); si alguna cambió o no existe, aborta sin escribir nada. Si ya está
-- inactiva, se salta.
-- Sin actor: la bitácora registra actor_id NULL.

do $$
declare
  v_ids constant uuid[] := array[
    'dcebf513-0398-43d3-97a7-694cf0280a01', -- "prueba"
    '9dd26470-67cb-4bd7-a2ae-40e5d2bbe7fb'  -- "inscripciones"
  ]::uuid[];
  v_titulos constant text[] := array['prueba', 'inscripciones'];
  v_id uuid;
  v_i int;
  v_fila public.carrusel_slide%rowtype;
begin
  for v_i in 1 .. array_length(v_ids, 1) loop
    v_id := v_ids[v_i];
    select * into v_fila from public.carrusel_slide where id = v_id for update;
    if not found then
      raise exception 'La diapositiva % ya no existe. Se aborta sin escribir.', v_id;
    end if;
    if v_fila.titulo is distinct from v_titulos[v_i] then
      raise exception 'La diapositiva % cambió de título (hoy: %). Se aborta sin escribir.', v_id, v_fila.titulo;
    end if;
  end loop;

  update public.carrusel_slide set activo = false where id = any (v_ids) and activo;
end
$$;
