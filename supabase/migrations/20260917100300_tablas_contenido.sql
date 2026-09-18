-- ---------------------------------------------------------------------------
-- TSW — 04. Contenido editorial: competencia y resultado
--
-- `competencia` es la entrada del calendario y la nota posterior. `resultado`
-- son los puestos de los riders en esa competencia. A diferencia del catálogo,
-- aquí sí hay borrado físico en cascada: un resultado no tiene vida propia
-- fuera de su competencia.
--
-- RLS se activa en la migración 08 (politicas_rls).
-- ---------------------------------------------------------------------------

-- --- competencia ------------------------------------------------------------

create table public.competencia (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null,
  slug           text not null,
  fecha          date not null,
  cuerpo         text,
  estado         public.estado_publicacion not null default 'borrador',
  destacado      boolean not null default false,
  imagen_path    text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  constraint competencia_slug_unico unique (slug),
  constraint competencia_slug_formato check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint competencia_titulo_no_vacio check (length(btrim(titulo)) > 0)
);

comment on table public.competencia is
  'Competencia del calendario: primero convocatoria, después crónica con resultados.';
comment on column public.competencia.fecha is
  'Fecha en que se corre la competencia, no la fecha de publicación de la nota.';
comment on column public.competencia.cuerpo is
  'Texto largo de la nota. Se escribe desde el panel.';
comment on column public.competencia.estado is
  'Nace en borrador. Solo estado = publicado es visible para el público.';
comment on column public.competencia.destacado is
  'Competencia que ocupa el espacio principal de la portada. Solo una a la vez.';
comment on column public.competencia.imagen_path is
  'Ruta dentro del bucket competencias. Si hay menores en la foto, debe existir autorización de uso de imagen firmada.';

-- Solo una competencia destacada en todo el sitio. El índice es parcial sobre
-- la expresión, así que las no destacadas no ocupan lugar en él.
create unique index competencia_destacada_unica
  on public.competencia ((destacado))
  where destacado;

comment on index public.competencia_destacada_unica is
  'Índice parcial único: como máximo una fila con destacado = true.';

-- El listado público siempre filtra por publicado y ordena por fecha.
create index competencia_publicada_fecha_idx
  on public.competencia (fecha desc)
  where estado = 'publicado';

create trigger competencia_actualizado_en
  before update on public.competencia
  for each row execute function public.set_actualizado_en();

-- Destacar una competencia quita el destaque de la anterior en la misma
-- transacción. Sin esto, el índice de arriba rechazaría la operación y el
-- administrador tendría que acordarse de desmarcar primero.
create or replace function public.destacar_competencia_unica()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.destacado then
    update public.competencia
       set destacado = false
     where destacado
       and id is distinct from new.id;
  end if;

  return new;
end;
$$;

comment on function public.destacar_competencia_unica() is
  'BEFORE INSERT/UPDATE en competencia: al marcar una destacada, desmarca la que lo estuviera.';

create trigger competencia_destacada_exclusiva
  before insert or update of destacado on public.competencia
  for each row when (new.destacado) execute function public.destacar_competencia_unica();

-- --- resultado --------------------------------------------------------------

create table public.resultado (
  id             uuid primary key default gen_random_uuid(),
  -- CASCADE, al contrario que en el catálogo: un resultado no significa nada
  -- sin su competencia y no está referenciado desde ninguna otra tabla.
  competencia_id uuid not null references public.competencia (id) on delete cascade,
  rider          text not null,
  categoria      text not null,
  puesto         integer not null,
  creado_en      timestamptz not null default now(),

  constraint resultado_puesto_positivo check (puesto > 0),
  constraint resultado_rider_no_vacio check (length(btrim(rider)) > 0),
  constraint resultado_categoria_no_vacia check (length(btrim(categoria)) > 0)
);

comment on table public.resultado is
  'Puesto de un rider en una competencia. No hay tabla de riders: el club publica resultados, no gestiona perfiles.';
comment on column public.resultado.rider is
  'Nombre del deportista tal como aparece en la planilla oficial.';
comment on column public.resultado.categoria is
  'Categoría en la que corrió, p. ej. "[Novatos 9-10]". Texto libre: cada competencia usa su propia nomenclatura.';
comment on column public.resultado.puesto is
  'Posición final. Sin restricción de unicidad: existen empates y descalificaciones.';

-- Cubre tanto el filtro por competencia como el orden de la tabla de
-- resultados, que se agrupa por categoría y se ordena por puesto.
create index resultado_competencia_id_idx
  on public.resultado (competencia_id, categoria, puesto);
