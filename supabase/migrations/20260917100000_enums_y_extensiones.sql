-- ---------------------------------------------------------------------------
-- TSW — 01. Extensiones, tipos enumerados y trigger genérico de timestamps
--
-- Base sobre la que se apoyan todas las migraciones siguientes. No crea
-- tablas: solo el vocabulario del dominio y la utilidad que mantiene
-- `actualizado_en` sin depender de que la aplicación se acuerde de enviarlo.
-- ---------------------------------------------------------------------------

-- --- Extensiones ------------------------------------------------------------

-- gen_random_uuid() para las claves primarias.
create extension if not exists pgcrypto with schema extensions;

-- --- Tipos enumerados -------------------------------------------------------

-- Ciclo de vida del pedido. La máquina de estados que lo gobierna vive en
-- `transicionar_pedido()` (migración 07); el enum solo declara los valores.
create type public.estado_pedido as enum (
  'pendiente',
  'pagado',
  'rechazado',
  'expirado',
  'preparando',
  'entregado',
  'cancelado'
);

comment on type public.estado_pedido is
  'Estados de un pedido. Terminales: rechazado, expirado, entregado, cancelado.';

create type public.categoria_producto as enum (
  'uniformes',
  'proteccion',
  'merchandising'
);

comment on type public.categoria_producto is
  'Categorías del catálogo de la tienda.';

-- Se usa en `competencia`. Un borrador no es visible para el público; un
-- archivado deja de serlo sin perder el registro histórico.
create type public.estado_publicacion as enum (
  'borrador',
  'publicado',
  'archivado'
);

comment on type public.estado_publicacion is
  'Visibilidad pública de un contenido editorial.';

-- Verbos de la bitácora. 'crear', 'actualizar' y 'eliminar' salen de TG_OP; los
-- otros tres los deduce el trigger cuando el cambio tiene un significado propio
-- más allá del UPDATE genérico.
--
-- 'eliminar' se declara aquí, en el CREATE TYPE, y no con un ALTER TYPE ... ADD
-- VALUE posterior: un valor agregado por ALTER no se puede usar en la misma
-- transacción que lo crea, y los triggers de auditoría lo necesitan de
-- inmediato.
create type public.accion_auditoria as enum (
  'crear',
  'actualizar',
  'eliminar',
  'publicar',
  'archivar',
  'cambiar_estado'
);

comment on type public.accion_auditoria is
  'Verbo registrado en evento_auditoria.';

-- --- Trigger genérico de timestamps ----------------------------------------

-- Se aplica como BEFORE UPDATE a toda tabla que tenga `actualizado_en`.
--
-- Va con SECURITY INVOKER (el valor por defecto), no DEFINER: un trigger no
-- necesita privilegios elevados para tocar la fila que ya se está escribiendo,
-- y elevarlo convertiría cualquier UPDATE en una ejecución con los permisos
-- del dueño de la función. El `search_path` sí queda fijo, que es lo que exige
-- el advisor de seguridad de Supabase.
create or replace function public.set_actualizado_en()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

comment on function public.set_actualizado_en() is
  'Trigger BEFORE UPDATE: refresca actualizado_en con now(). Se aplica a toda tabla editable.';
