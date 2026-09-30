-- Cifras de la portada: el número pasa de la etiqueta al campo `valor`.
--
-- El panel no tenía campo para la cifra, así que la fila vigente de
-- contenido_sitio (clave 'portada') guardó el número dentro de `etiqueta`
-- ("+80", "4 Años de trayectoria", "2 clubes", "100 %") y dejó `valor` en null.
-- Esta migración reparte cada dato en su sitio y borra la clave huérfana
-- `cifraPendiente` (el sitio ya no la lee: una cifra sin valor se oculta).
--
-- Idempotente: solo actúa si las cuatro cifras siguen con valor null Y la fila
-- tiene cuatro. Si alguien ya las corrigió desde el panel, no toca nada.
-- Escribe directo, sin pasar por guardar_contenido(): una migración no tiene
-- actor, así que el evento de bitácora queda con actor_id NULL.

update public.contenido_sitio
set valor = (valor - 'cifraPendiente') || jsonb_build_object('cifras', jsonb_build_array(
      jsonb_build_object('valor', 80,  'sufijo', '+', 'etiqueta', 'Deportistas',
                         'detalle', valor #>> '{cifras,0,detalle}'),
      jsonb_build_object('valor', 4,   'sufijo', '',  'etiqueta', 'Años de trayectoria',
                         'detalle', valor #>> '{cifras,1,detalle}'),
      jsonb_build_object('valor', 2,   'sufijo', '',  'etiqueta', 'Clubes',
                         'detalle', valor #>> '{cifras,2,detalle}'),
      -- La etiqueta original era "100 %" y el sufijo "inscripciones ", y el
      -- detalle habla de entrenadores: no se puede deducir qué mide la cifra.
      jsonb_build_object('valor', 100, 'sufijo', '%', 'etiqueta', '[Etiqueta pendiente]',
                         'detalle', valor #>> '{cifras,3,detalle}')
    ))
where clave = 'portada'
  and jsonb_array_length(valor -> 'cifras') = 4
  and not exists (
    select 1 from jsonb_array_elements(valor -> 'cifras') c where c ->> 'valor' is not null
  );
