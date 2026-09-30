-- Deporte BMX: quita el texto de fábrica que sigue a la vista en la portada.
--
-- Hoy la fila `bmx` de `deporte` conserva:
--   pie         = '[Cupos por semestre]'
--   descripcion = 'Presentación del BMX en la corporación: a quién va dirigido y qué ofrece.'
--
-- Nuevo:
--   pie         = ''   (la columna admite vacío; la tarjeta no pinta pie vacío)
--   descripcion = la bajada de «Nuestros clubes y programa» del documento
--                 definitivo (docs/contenido-tsw-por-pagina.md, Página de
--                 inicio), palabra por palabra. No hay un texto del documento
--                 solo para BMX y no se inventa uno.
--
-- Guarda: se escribe solo si AMBOS campos siguen con el valor de fábrica leído
-- de producción el 2026-09-30. Si alguno cambió (alguien lo editó desde el
-- panel), aborta sin escribir. Si ya tienen el valor nuevo, se salta.
-- Sin actor: la bitácora registra actor_id NULL.

do $$
declare
  v_fila public.deporte%rowtype;

  v_pie_viejo constant text := '[Cupos por semestre]';
  v_desc_vieja constant text := 'Presentación del BMX en la corporación: a quién va dirigido y qué ofrece.';

  v_pie_nuevo constant text := '';
  v_desc_nueva constant text :=
    'La Corporación Deportiva TSW agrupa dos clubes de BMX, cada uno con su propia identidad, y un programa de habilidades motrices. Todos comparten escenarios, valores y un equipo de entrenadores ex atletas y licenciados en deporte.';
begin
  select * into v_fila from public.deporte where slug = 'bmx' for update;
  if not found then
    raise exception 'No existe el deporte bmx. Se aborta sin escribir.';
  end if;

  if v_fila.pie = v_pie_nuevo and v_fila.descripcion = v_desc_nueva then
    return; -- ya está
  end if;

  if v_fila.pie is distinct from v_pie_viejo then
    raise exception 'deporte bmx: el pie cambió desde la lectura (hoy: %). Se aborta sin escribir.', v_fila.pie;
  end if;
  if v_fila.descripcion is distinct from v_desc_vieja then
    raise exception 'deporte bmx: la descripción cambió desde la lectura (hoy: %). Se aborta sin escribir.', v_fila.descripcion;
  end if;

  update public.deporte set pie = v_pie_nuevo, descripcion = v_desc_nueva where slug = 'bmx';
end
$$;
