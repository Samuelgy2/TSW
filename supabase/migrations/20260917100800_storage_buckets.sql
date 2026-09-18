-- ---------------------------------------------------------------------------
-- TSW — 09. Buckets de Storage
--
--   documentos-matricula : PDF que cualquiera descarga
--   productos            : fotos del catálogo
--   competencias         : fotos de podios y galerías
--
-- Los tres son públicos de lectura y de escritura exclusiva del rol
-- autenticado. Límite de 10 MB por archivo y tipos MIME restringidos: sin eso,
-- el bucket de documentos aceptaría cualquier cosa, incluido un HTML servido
-- desde el dominio de Supabase.
--
-- Cada bucket admite una sola carpeta raíz, la de su propio nombre lógico. Sin
-- esa restricción, un token autenticado podría escribir en cualquier ruta.
--
-- ⚠️ MENORES DE EDAD: el bucket `competencias` contiene fotos de deportistas
-- menores. El control es documental, no técnico: solo se publica material con
-- autorización de uso de imagen firmada por el acudiente. La base de datos no
-- puede comprobar que esa autorización exista.
-- ---------------------------------------------------------------------------

-- DO UPDATE y no DO NOTHING: si el bucket ya existe con otra configuración
-- —sin límite de tamaño, o aceptando cualquier MIME— hay que corregirlo. Con
-- DO NOTHING la migración pasaría en verde dejando el bucket mal configurado.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'documentos-matricula',
    'documentos-matricula',
    true,
    10485760,                      -- 10 MB
    array['application/pdf']
  ),
  (
    'productos',
    'productos',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  ),
  (
    'competencias',
    'competencias',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  )
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- --- Lectura pública --------------------------------------------------------

-- Los buckets públicos se sirven por CDN sin pasar por RLS, pero listar y leer
-- objetos desde el cliente sí pasa por storage.objects. Esta política lo
-- habilita para los tres buckets y solo para los tres.
create policy "tsw lectura publica de archivos"
  on storage.objects for select to anon, authenticated
  using (bucket_id in ('documentos-matricula', 'productos', 'competencias'));

-- --- Escritura del administrador, restringida por carpeta -------------------

-- documentos-matricula: la ruta es documentos/{documento_id}/v{version}/{archivo},
-- la misma que valida el CHECK de documento_version (migración 03).
create policy "tsw documentos subida"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documentos-matricula'
    and (storage.foldername(name))[1] = 'documentos'
  );

comment on policy "tsw documentos subida" on storage.objects is
  'Solo el administrador sube PDF, y solo bajo la carpeta documentos/. La versión va dentro de la ruta, así que una publicación nueva nunca pisa el archivo anterior.';

create policy "tsw productos subida"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'productos'
    and (storage.foldername(name))[1] = 'productos'
  );

create policy "tsw competencias subida"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'competencias'
    and (storage.foldername(name))[1] = 'competencias'
  );

comment on policy "tsw competencias subida" on storage.objects is
  'Fotos de competencias. Contienen menores de edad: solo se sube material con autorización de uso de imagen firmada por el acudiente. El formulario de publicación debe exigir esa confirmación antes de habilitar la carga (requisito de fase 2).';

-- Reemplazo: solo donde tiene sentido reemplazar un archivo en su sitio.
create policy "tsw productos reemplazo"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'productos'
    and (storage.foldername(name))[1] = 'productos'
  )
  with check (
    bucket_id = 'productos'
    and (storage.foldername(name))[1] = 'productos'
  );

create policy "tsw competencias reemplazo"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'competencias'
    and (storage.foldername(name))[1] = 'competencias'
  )
  with check (
    bucket_id = 'competencias'
    and (storage.foldername(name))[1] = 'competencias'
  );

-- Borrado: `documentos-matricula` queda fuera a propósito. Una versión de
-- documento es evidencia de lo que se publicó, y la migración 03 bloquea
-- UPDATE y DELETE sobre su fila; borrar el archivo dejaría la fila apuntando
-- al vacío. Para retirar un PDF se publica una versión nueva. Si alguna vez
-- hay que eliminarlo de verdad, se hace con la service role key y queda
-- constancia.
create policy "tsw productos borrado"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'productos'
    and (storage.foldername(name))[1] = 'productos'
  );

create policy "tsw competencias borrado"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'competencias'
    and (storage.foldername(name))[1] = 'competencias'
  );
