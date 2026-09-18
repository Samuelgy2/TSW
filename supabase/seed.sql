-- ---------------------------------------------------------------------------
-- TSW — datos de prueba
--
-- Se aplica solo en desarrollo: `supabase db reset` lo ejecuta al final de las
-- migraciones, y `supabase db push --include-seed` lo manda al proyecto
-- enlazado. NO es contenido real del sitio.
--
-- ⚠️ TODO EL TEXTO ENTRE CORCHETES ES UN PLACEHOLDER que hay que reemplazar con
-- la información que dé el club. Los precios son deliberadamente absurdos
-- ($10 y $20 COP) para que nadie los confunda con precios reales. Los nombres
-- de los riders también son placeholders: esos datos son reales y no se
-- inventan.
--
-- El seed es idempotente: usa UUID fijos y ON CONFLICT DO UPDATE, así que
-- volver a aplicarlo devuelve la base al mismo estado en vez de duplicar.
--
-- Contiene a propósito los casos negativos que necesita la verificación de RLS:
-- un producto desactivado con variantes activas, una competencia en borrador y
-- un documento desactivado con su versión vigente. Sin ellos, una política mal
-- escrita y una tabla vacía se ven igual: ambas devuelven cero filas.
-- ---------------------------------------------------------------------------

-- --- Niveles y semilleros (4 activos) ---------------------------------------

insert into public.nivel (id, nombre, orden, rango_edad, horario, descripcion, criterio_promocion, activo)
values
  ('11111111-1111-4111-8111-000000000001', '[Semillero — nombre pendiente]',        1, '[rango de edad]', '[días y horas]', '[Primer contacto con la bicicleta y la pista.]', '[Criterio de promoción pendiente.]', true),
  ('11111111-1111-4111-8111-000000000002', '[Nivel formativo 1 — nombre pendiente]', 2, '[rango de edad]', '[días y horas]', '[Descripción pendiente.]',                      '[Criterio de promoción pendiente.]', true),
  ('11111111-1111-4111-8111-000000000003', '[Nivel formativo 2 — nombre pendiente]', 3, '[rango de edad]', '[días y horas]', '[Descripción pendiente.]',                      '[Criterio de promoción pendiente.]', true),
  ('11111111-1111-4111-8111-000000000004', '[Nivel competitivo — nombre pendiente]', 4, '[rango de edad]', '[días y horas]', '[Descripción pendiente.]',                      '[Criterio de promoción pendiente.]', true)
on conflict (id) do update
  set nombre = excluded.nombre,
      orden = excluded.orden,
      rango_edad = excluded.rango_edad,
      horario = excluded.horario,
      descripcion = excluded.descripcion,
      criterio_promocion = excluded.criterio_promocion,
      activo = excluded.activo;

-- --- Catálogo: 3 productos activos y 1 desactivado ---------------------------

insert into public.producto (id, nombre, slug, categoria, descripcion, activo, orden)
values
  ('22222222-2222-4222-8222-000000000001', '[Uniforme oficial — nombre pendiente]', 'uniforme-oficial',            'uniformes',     '[Descripción pendiente. Lleva estampado personalizado: al cancelarse un pedido en preparación, la unidad no vuelve a inventario.]', true,  1),
  ('22222222-2222-4222-8222-000000000002', '[Kit de protección — nombre pendiente]', 'kit-proteccion',             'proteccion',    '[Descripción pendiente.]', true,  2),
  ('22222222-2222-4222-8222-000000000003', '[Merchandising — nombre pendiente]',     'merch-oficial',              'merchandising', '[Descripción pendiente.]', true,  3),
  -- Desactivado a propósito: sus variantes están activas, así que sirve para
  -- comprobar que la política de `variante` exige además producto activo.
  ('22222222-2222-4222-8222-000000000004', '[Producto retirado — caso de prueba]',   'producto-desactivado-prueba', 'merchandising', '[Descripción pendiente.]', false, 4)
on conflict (id) do update
  set nombre = excluded.nombre,
      slug = excluded.slug,
      categoria = excluded.categoria,
      descripcion = excluded.descripcion,
      activo = excluded.activo,
      orden = excluded.orden;

-- precio_centavos: 1000 = $10 COP, 2000 = $20 COP. Placeholders evidentes.
insert into public.variante (id, producto_id, talla, precio_centavos, stock, sku, activo)
values
  ('33333333-3333-4333-8333-000000000001', '22222222-2222-4222-8222-000000000001', 'S',          1000, 10, 'PRUEBA-UNIFORME-S',   true),
  ('33333333-3333-4333-8333-000000000002', '22222222-2222-4222-8222-000000000001', 'M',          1000, 10, 'PRUEBA-UNIFORME-M',   true),
  ('33333333-3333-4333-8333-000000000003', '22222222-2222-4222-8222-000000000001', 'L',          1000,  4, 'PRUEBA-UNIFORME-L',   true),
  ('33333333-3333-4333-8333-000000000004', '22222222-2222-4222-8222-000000000002', '[talla A]',  2000,  6, 'PRUEBA-PROTECCION-A', true),
  ('33333333-3333-4333-8333-000000000006', '22222222-2222-4222-8222-000000000002', '[talla B]',  2000,  3, 'PRUEBA-PROTECCION-B', true),
  ('33333333-3333-4333-8333-000000000007', '22222222-2222-4222-8222-000000000003', 'S',          1000,  8, 'PRUEBA-MERCH-S',      true),
  ('33333333-3333-4333-8333-000000000008', '22222222-2222-4222-8222-000000000003', 'M',          1000,  8, 'PRUEBA-MERCH-M',      true),
  -- Stock 1: es la variante con la que se prueba la sobreventa concurrente.
  ('33333333-3333-4333-8333-000000000009', '22222222-2222-4222-8222-000000000003', 'L',          1000,  1, 'PRUEBA-MERCH-L',      true),
  -- Variante ACTIVA de un producto DESACTIVADO: el caso negativo de RLS.
  ('33333333-3333-4333-8333-000000000005', '22222222-2222-4222-8222-000000000004', 'unica',      1000,  2, 'PRUEBA-RETIRADO',     true)
on conflict (id) do update
  set producto_id = excluded.producto_id,
      talla = excluded.talla,
      precio_centavos = excluded.precio_centavos,
      stock = excluded.stock,
      sku = excluded.sku,
      activo = excluded.activo;

-- --- Competencias: 2 publicadas y 1 en borrador ------------------------------

insert into public.competencia (id, titulo, slug, fecha, cuerpo, estado, destacado, imagen_path)
values
  ('44444444-4444-4444-8444-000000000001', '[Competencia publicada 1 — título pendiente]', 'competencia-publicada-1', '2026-01-01', '[Cuerpo de la nota pendiente.]', 'publicado', true,  null),
  ('44444444-4444-4444-8444-000000000002', '[Competencia publicada 2 — título pendiente]', 'competencia-publicada-2', '2026-02-01', '[Cuerpo de la nota pendiente.]', 'publicado', false, null),
  -- En borrador: no debe verse con la anon key.
  ('44444444-4444-4444-8444-000000000003', '[Competencia en borrador — caso de prueba]',   'competencia-borrador',    '2026-03-01', '[Cuerpo de la nota pendiente.]', 'borrador',  false, null)
on conflict (id) do update
  set titulo = excluded.titulo,
      slug = excluded.slug,
      fecha = excluded.fecha,
      cuerpo = excluded.cuerpo,
      estado = excluded.estado,
      destacado = excluded.destacado;

-- Los nombres de los riders son placeholders: los reales se cargan desde el
-- panel cuando el club entregue las planillas.
insert into public.resultado (id, competencia_id, rider, categoria, puesto)
values
  ('99999999-9999-4999-8999-000000000001', '44444444-4444-4444-8444-000000000001', '[Rider 1]', '[Categoría A]', 1),
  ('99999999-9999-4999-8999-000000000002', '44444444-4444-4444-8444-000000000001', '[Rider 2]', '[Categoría A]', 2),
  -- Resultado de la competencia en borrador: tampoco debe verse.
  ('99999999-9999-4999-8999-000000000003', '44444444-4444-4444-8444-000000000003', '[Rider 3]', '[Categoría A]', 1)
on conflict (id) do update
  set rider = excluded.rider,
      categoria = excluded.categoria,
      puesto = excluded.puesto;

-- --- Documentos: 3 activos y 1 desactivado, todos con versión vigente --------

insert into public.documento (id, titulo, descripcion, activo, orden)
values
  ('55555555-5555-4555-8555-000000000001', '[Ficha de inscripción — título pendiente]',   '[Instrucciones pendientes. La radicación es presencial.]', true,  1),
  ('55555555-5555-4555-8555-000000000002', '[Reglamento interno — título pendiente]',     '[Instrucciones pendientes.]',                              true,  2),
  ('55555555-5555-4555-8555-000000000003', '[Autorización médica — título pendiente]',    '[Instrucciones pendientes.]',                              true,  3),
  -- Desactivado: su versión vigente no debe verse con la anon key.
  ('55555555-5555-4555-8555-000000000004', '[Documento retirado — caso de prueba]',       '[Instrucciones pendientes.]',                              false, 4)
on conflict (id) do update
  set titulo = excluded.titulo,
      descripcion = excluded.descripcion,
      activo = excluded.activo,
      orden = excluded.orden;

-- DO NOTHING y no DO UPDATE: una versión publicada es inmutable y el trigger
-- rechaza cualquier UPDATE que no sea sobre archivado_en.
-- El archivo no existe en Storage; aquí solo interesa la fila.
insert into public.documento_version (id, documento_id, version, storage_path, nombre_archivo, tamano_bytes)
values
  ('66666666-6666-4666-8666-000000000001', '55555555-5555-4555-8555-000000000001', 1, 'documentos/55555555-5555-4555-8555-000000000001/v1/ficha-inscripcion.pdf',  'ficha-inscripcion.pdf',  1024),
  ('66666666-6666-4666-8666-000000000002', '55555555-5555-4555-8555-000000000002', 1, 'documentos/55555555-5555-4555-8555-000000000002/v1/reglamento-interno.pdf', 'reglamento-interno.pdf', 2048),
  ('66666666-6666-4666-8666-000000000003', '55555555-5555-4555-8555-000000000003', 1, 'documentos/55555555-5555-4555-8555-000000000003/v1/autorizacion-medica.pdf','autorizacion-medica.pdf',1536),
  ('66666666-6666-4666-8666-000000000004', '55555555-5555-4555-8555-000000000004', 1, 'documentos/55555555-5555-4555-8555-000000000004/v1/documento-retirado.pdf', 'documento-retirado.pdf', 1024)
on conflict (id) do nothing;

-- --- Un pedido pendiente con sus ítems ---------------------------------------

-- La referencia va explícita, fuera del rango del consecutivo automático, para
-- que el seed sea idempotente sin consumir números reales.
insert into public.pedido (id, referencia, estado, comprador_nombre, comprador_email, comprador_telefono, notas)
values
  (
    '77777777-7777-4777-8777-000000000001',
    'TSW-2026-999001',
    'pendiente',
    '[Comprador de prueba]',
    'comprador.prueba@tsw.local',
    '3000000000',
    '[Pedido de prueba del seed. No corresponde a una compra real.]'
  )
on conflict (id) do update
  set estado = excluded.estado,
      notas = excluded.notas;

-- El total NO se escribe: lo calcula el trigger a partir de estas líneas.
insert into public.pedido_item (id, pedido_id, variante_id, cantidad, precio_unitario_centavos, nombre_producto, talla)
values
  ('88888888-8888-4888-8888-000000000001', '77777777-7777-4777-8777-000000000001', '33333333-3333-4333-8333-000000000001', 1, 1000, '[Uniforme oficial — nombre pendiente]', 'S'),
  ('88888888-8888-4888-8888-000000000002', '77777777-7777-4777-8777-000000000001', '33333333-3333-4333-8333-000000000002', 2, 1000, '[Uniforme oficial — nombre pendiente]', 'M')
on conflict (id) do update
  set cantidad = excluded.cantidad,
      precio_unitario_centavos = excluded.precio_unitario_centavos;

-- Una transacción de prueba, para que la verificación de RLS sobre
-- `transaccion` sea concluyente y no un falso positivo por tabla vacía.
insert into public.transaccion (id, pedido_id, wompi_id, estado, monto_centavos, metodo_pago, payload_json, firma_valida)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-000000000001',
    '77777777-7777-4777-8777-000000000001',
    'PRUEBA-WOMPI-0001',
    'PENDING',
    3000,
    '[metodo de pago]',
    '{"evento":"[payload de prueba]","nota":"No es un evento real de Wompi."}'::jsonb,
    false
  )
on conflict (id) do nothing;
