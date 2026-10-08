-- Quita el listado público de los buckets.
--
-- Los buckets son públicos: GET /storage/v1/object/public/<bucket>/<ruta> sirve
-- el archivo sin pasar por storage.objects ni RLS, así que las fotos y PDF
-- siguen cargando por su URL. Lo que daban estas dos políticas de `select` era
-- listar los nombres de los objetos por la API (storage.objects.list), y en
-- `competencias` eso enumera fotos de menores. La aplicación nunca lista ni
-- lee desde el cliente: sube con URL firmada y borra con la service role.
--
-- Tras aplicar: comprobar que las imágenes de /competencias, /tienda, /
-- y el PDF de /matriculas siguen cargando.

drop policy "tsw lectura publica de archivos" on storage.objects;
drop policy "tsw sitio lectura publica" on storage.objects;
