-- ---------------------------------------------------------------------------
-- TSW — 03. Documentos de matrícula y su historial de versiones
--
-- `documento` es la entrada estable que ve el público ("Ficha de inscripción").
-- `documento_version` es el archivo concreto: inmutable, numerado y con
-- historial completo. Publicar una versión nueva archiva la anterior; nada se
-- borra ni se sobrescribe, porque un padre puede haber radicado un formato
-- viejo y hay que poder reconstruir cuál era el vigente en esa fecha.
--
-- RLS se activa en la migración 08 (politicas_rls).
-- ---------------------------------------------------------------------------

-- --- documento --------------------------------------------------------------

create table public.documento (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null,
  descripcion    text,
  activo         boolean not null default true,
  orden          integer not null default 0,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  constraint documento_titulo_no_vacio check (length(btrim(titulo)) > 0)
);

comment on table public.documento is
  'Documento descargable de matrícula. El archivo no vive aquí, sino en documento_version.';
comment on column public.documento.descripcion is
  'Para qué sirve el documento y qué debe hacer el acudiente con él. La radicación es presencial.';
comment on column public.documento.activo is
  'Borrado lógico. Desactivar oculta el documento del sitio sin perder su historial de versiones.';
comment on column public.documento.orden is
  'Posición en la lista de descargas. Menor primero.';

create trigger documento_actualizado_en
  before update on public.documento
  for each row execute function public.set_actualizado_en();

-- --- documento_version ------------------------------------------------------

create table public.documento_version (
  id             uuid primary key default gen_random_uuid(),
  documento_id   uuid not null references public.documento (id) on delete restrict,
  version        integer not null,
  storage_path   text not null,
  nombre_archivo text not null,
  tamano_bytes   integer not null,
  publicado_en   timestamptz not null default now(),
  archivado_en   timestamptz,
  subido_por     uuid references auth.users (id) on delete set null,
  creado_en      timestamptz not null default now(),

  constraint documento_version_unica unique (documento_id, version),
  constraint documento_version_numero_positivo check (version > 0),
  constraint documento_version_tamano_positivo check (tamano_bytes > 0),
  constraint documento_version_archivo_posterior check (
    archivado_en is null or archivado_en >= publicado_en
  ),
  -- La ruta lleva el número de versión adentro. Sin esto, la fila es inmutable
  -- pero el objeto de Storage se puede sobrescribir en la misma ruta y el PDF
  -- cambia sin que quede rastro en la base.
  -- Convención: documentos/{documento_id}/v{version}/{nombre_archivo}
  constraint documento_version_ruta_versionada check (
    storage_path like 'documentos/' || documento_id::text || '/v' || version::text || '/%'
  )
);

comment on table public.documento_version is
  'Versión inmutable de un documento. Nunca se borra ni se sobrescribe: publicar una nueva archiva la anterior.';
comment on column public.documento_version.version is
  'Consecutivo por documento, desde 1. Se obtiene con siguiente_version_documento() antes de subir el archivo.';
comment on column public.documento_version.storage_path is
  'Ruta dentro del bucket documentos-matricula, con formato documentos/{documento_id}/v{version}/{nombre_archivo}. Como la versión va en la ruta, publicar una versión nueva nunca pisa el archivo anterior.';
comment on column public.documento_version.archivado_en is
  'NULL = versión vigente. Con fecha = versión histórica, sustituida por otra.';
comment on column public.documento_version.subido_por is
  'Administrador que publicó la versión. Queda en NULL si el usuario se elimina; la versión sobrevive.';

-- La regla central: como máximo una versión vigente por documento. La hace
-- cumplir la base, no la aplicación.
create unique index documento_version_una_vigente
  on public.documento_version (documento_id)
  where archivado_en is null;

comment on index public.documento_version_una_vigente is
  'Índice parcial único: solo puede existir una fila con archivado_en IS NULL por documento.';

-- Listado del historial en el panel, de la versión más nueva a la más vieja.
create index documento_version_historial_idx
  on public.documento_version (documento_id, version desc);

-- --- Número de versión ------------------------------------------------------

-- Hay que conocer la versión ANTES de subir el archivo, porque va dentro de la
-- ruta. Por eso el número no se asigna solo en el INSERT: primero se pide aquí,
-- después se sube el PDF a esa ruta, y al final se inserta la fila.
create or replace function public.siguiente_version_documento(p_documento_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(version), 0) + 1
    from public.documento_version
   where documento_id = p_documento_id;
$$;

comment on function public.siguiente_version_documento(uuid) is
  'Número que le toca a la próxima versión de un documento. Se llama antes de subir el archivo, para armar storage_path.';

-- Solo lee un número, pero es SECURITY DEFINER: se le quita a anon el EXECUTE
-- que Postgres concede por defecto. El panel sí la necesita, porque sube el
-- archivo desde el navegador con su sesión autenticada.
revoke execute on function public.siguiente_version_documento(uuid) from public, anon;
grant execute on function public.siguiente_version_documento(uuid) to authenticated, service_role;

-- --- Archivado de la versión anterior ---------------------------------------

-- Publicar una versión archiva la anterior en la MISMA transacción. Va como
-- trigger y no como código de aplicación por lo mismo que la auditoría: así no
-- se puede olvidar.
create or replace function public.archivar_version_anterior()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo una versión que nace vigente desplaza a la anterior. Cargar una
  -- versión ya archivada (una migración de historial, por ejemplo) no toca
  -- nada.
  if new.archivado_en is null then
    update public.documento_version
       set archivado_en = now()
     where documento_id = new.documento_id
       and archivado_en is null
       and id is distinct from new.id;
  end if;

  return new;
end;
$$;

comment on function public.archivar_version_anterior() is
  'BEFORE INSERT en documento_version: archiva la versión vigente anterior del mismo documento.';

create trigger documento_version_archivar_anterior
  before insert on public.documento_version
  for each row execute function public.archivar_version_anterior();

-- --- Inmutabilidad ----------------------------------------------------------

-- El archivo publicado es evidencia. Lo único editable es `archivado_en`:
-- cualquier otro cambio exige publicar una versión nueva.
create or replace function public.documento_version_inmutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Una versión publicada no se borra: archívela publicando una versión nueva.'
      using errcode = 'restrict_violation';
  end if;

  if new.id           is distinct from old.id
  or new.documento_id is distinct from old.documento_id
  or new.version      is distinct from old.version
  or new.storage_path is distinct from old.storage_path
  or new.nombre_archivo is distinct from old.nombre_archivo
  or new.tamano_bytes is distinct from old.tamano_bytes
  or new.publicado_en is distinct from old.publicado_en
  or new.subido_por   is distinct from old.subido_por
  or new.creado_en    is distinct from old.creado_en then
    raise exception 'Una versión publicada es inmutable: solo puede cambiar archivado_en.'
      using errcode = 'restrict_violation';
  end if;

  return new;
end;
$$;

comment on function public.documento_version_inmutable() is
  'Bloquea DELETE y cualquier UPDATE sobre documento_version que no sea archivado_en.';

create trigger documento_version_inmutable_upd
  before update on public.documento_version
  for each row execute function public.documento_version_inmutable();

create trigger documento_version_inmutable_del
  before delete on public.documento_version
  for each row execute function public.documento_version_inmutable();
