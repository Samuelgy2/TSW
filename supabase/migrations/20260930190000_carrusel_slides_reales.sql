-- Carrusel de la portada: las tres diapositivas del documento definitivo
-- (docs/contenido-tsw-por-pagina.md), en lugar de las de prueba.
--
-- Textos, palabra por palabra del documento:
--   1. «Clase de prueba gratis» — «Conoce el club antes de matricularte. Te
--      prestamos bici y casco.» (Matrículas, bloque superior) — botón
--      «Escribir por WhatsApp» (Semilleros, llamado final) → wa.me
--   2. «Inscripciones abiertas todo el año» — «Puedes inscribirte en cualquier
--      momento, según los cupos de cada grupo.» (Matrículas, bloque superior) —
--      botón «Ver matrículas» → /matriculas
--   3. «De Minirider a la competencia» — primera frase del pilar «Una ruta
--      completa» (Inicio) — botón «Conocer los niveles» → /semilleros
--
-- Imágenes: SOLO las que ya están en el bucket `sitio`. No se sube ninguna.
-- Hay dos fotos reales del club, las de las diapositivas de prueba:
--   carrusel/405dd5e0-…png  niños en bici de impulso con casco, con su
--                            entrenador (va en 1 y 3: «Minirider»)
--   carrusel/9ba15c37-…jpg  dos riders de TSW en la rampa de salida (va en 2)
-- La misma foto se repite en dos diapositivas porque no hay una tercera foto
-- del club que sirva: el resto de archivos del bucket es una captura de
-- pantalla ajena, una foto de baja resolución de la pista y un retrato de
-- estudio cuyo permiso de uso no consta.
--
-- Sin deporte_id: las diapositivas de la corporación no dependen de que un
-- deporte esté activo.
--
-- Guarda: aborta si ya existe una diapositiva ACTIVA con alguno de los tres
-- títulos, o si falta alguna de las dos imágenes en Storage. Comprueba todo
-- antes de insertar. Se APLICA DESPUÉS de 20260930180000 (el destino de la
-- primera es un enlace de WhatsApp). Sin actor: la bitácora registra NULL.

do $$
declare
  v_img_ninos constant text := 'carrusel/405dd5e0-8fa7-4bbd-90bb-b23daaaeac34.png';
  v_img_rampa constant text := 'carrusel/9ba15c37-56cd-4b6c-b211-0186120a861f.jpg';

  v_slides constant jsonb := jsonb_build_array(
    jsonb_build_object(
      'orden', 0,
      'titulo', 'Clase de prueba gratis',
      'descripcion', 'Conoce el club antes de matricularte. Te prestamos bici y casco.',
      'etiqueta', 'Escribir por WhatsApp',
      'destino', 'https://wa.me/573227073535',
      'imagen', v_img_ninos),
    jsonb_build_object(
      'orden', 1,
      'titulo', 'Inscripciones abiertas todo el año',
      'descripcion', 'Puedes inscribirte en cualquier momento, según los cupos de cada grupo.',
      'etiqueta', 'Ver matrículas',
      'destino', '/matriculas',
      'imagen', v_img_rampa),
    jsonb_build_object(
      'orden', 2,
      'titulo', 'De Minirider a la competencia',
      'descripcion', 'Acompañamos a cada deportista desde las categorías menores hasta las mayores, y desde la formación básica hasta la competencia regional, departamental y nacional.',
      'etiqueta', 'Conocer los niveles',
      'destino', '/semilleros',
      'imagen', v_img_ninos)
  );

  v_slide jsonb;
begin
  -- Nada se inserta hasta que todas las comprobaciones pasan.
  for v_slide in select * from jsonb_array_elements(v_slides) loop
    if exists (
      select 1 from public.carrusel_slide
       where activo and titulo = v_slide ->> 'titulo'
    ) then
      raise exception 'Ya existe una diapositiva activa con el título «%». Se aborta sin escribir.', v_slide ->> 'titulo';
    end if;

    if not exists (
      select 1 from storage.objects where bucket_id = 'sitio' and name = v_slide ->> 'imagen'
    ) then
      raise exception 'No existe la imagen % en el bucket sitio. Se aborta sin escribir.', v_slide ->> 'imagen';
    end if;
  end loop;

  for v_slide in select * from jsonb_array_elements(v_slides) loop
    insert into public.carrusel_slide (orden, titulo, descripcion, etiqueta_enlace, destino_enlace, imagen_path, activo)
    values (
      (v_slide ->> 'orden')::int,
      v_slide ->> 'titulo',
      v_slide ->> 'descripcion',
      v_slide ->> 'etiqueta',
      v_slide ->> 'destino',
      v_slide ->> 'imagen',
      true
    );
  end loop;
end
$$;
