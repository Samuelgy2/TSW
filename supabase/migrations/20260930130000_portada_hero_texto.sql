-- Portada: etiqueta superior, presentación y aval, del documento definitivo
-- (docs/contenido-tsw-por-pagina.md, "Página de inicio · Portada").
--
-- Hoy en producción la etiqueta y la presentación siguen siendo los
-- placeholders de fábrica ("[Entidad deportiva]", "[Presentación de la
-- corporación…]") y se ven a la vista cuando la portada no tiene diapositivas.
--
-- Regla de escritura: solo se pisa un campo si su valor ACTUAL es exactamente
-- el que se leyó de producción el 2026-09-30. Si alguien lo cambió después, la
-- migración aborta sin escribir nada (la transacción entera se revierte) y hay
-- que revisar a mano. Si el campo ya tiene el valor nuevo, se salta sin error.
-- Solo se tocan estas tres claves del JSON; el resto de `portada` queda igual.
--
-- Una migración no tiene actor: el evento de bitácora queda con actor_id NULL.

do $$
declare
  v_fila jsonb;
  v_nuevo jsonb;

  v_etiqueta_vieja constant text := '[Entidad deportiva]';
  v_etiqueta_nueva constant text := 'Entidad deportiva · BMX · Habilidades motrices';

  v_presentacion_vieja constant text :=
    '[Presentación de la corporación en dos frases: qué deportes forma, para quién y con qué enfoque.]';
  v_presentacion_nueva constant text :=
    'Desde 2022 formamos niños, niñas y jóvenes en Medellín a través del BMX. Con nuestros clubes BMX Club TSW y BMX Mastercross, y el Programa de Habilidades Motrices, acompañamos a cada deportista desde sus primeros pasos hasta la competencia.';

  v_aval_viejo constant text :=
    'Reconocimiento deportivo INDER Medellín · Afiliada a la Liga Antioqueña de Ciclismo';
  v_aval_nuevo constant text :=
    'Reconocimiento deportivo INDER Medellín · Afiliada a la Liga Antioqueña de Ciclismo · Desde 2022';
begin
  -- Bloquea la fila: nadie la cambia entre la comprobación y la escritura.
  select valor into v_fila from public.contenido_sitio where clave = 'portada' for update;
  if v_fila is null then
    raise exception 'No existe la fila portada en contenido_sitio: nada que actualizar.';
  end if;

  v_nuevo := v_fila;

  if v_fila ->> 'etiquetaEntidad' = v_etiqueta_nueva then
    null; -- ya está
  elsif v_fila ->> 'etiquetaEntidad' = v_etiqueta_vieja then
    v_nuevo := jsonb_set(v_nuevo, '{etiquetaEntidad}', to_jsonb(v_etiqueta_nueva));
  else
    raise exception 'portada.etiquetaEntidad cambió desde la lectura (hoy: %). Se aborta sin escribir.', v_fila ->> 'etiquetaEntidad';
  end if;

  if v_fila ->> 'presentacion' = v_presentacion_nueva then
    null;
  elsif v_fila ->> 'presentacion' = v_presentacion_vieja then
    v_nuevo := jsonb_set(v_nuevo, '{presentacion}', to_jsonb(v_presentacion_nueva));
  else
    raise exception 'portada.presentacion cambió desde la lectura (hoy: %). Se aborta sin escribir.', v_fila ->> 'presentacion';
  end if;

  if v_fila ->> 'aval' = v_aval_nuevo then
    null;
  elsif v_fila ->> 'aval' = v_aval_viejo then
    v_nuevo := jsonb_set(v_nuevo, '{aval}', to_jsonb(v_aval_nuevo));
  else
    raise exception 'portada.aval cambió desde la lectura (hoy: %). Se aborta sin escribir.', v_fila ->> 'aval';
  end if;

  if v_nuevo is distinct from v_fila then
    update public.contenido_sitio set valor = v_nuevo where clave = 'portada';
  end if;
end
$$;
