-- RLS de administración exige el segundo factor (aal2), no solo la contraseña.
--
-- Hallazgo (auditoría 2026-10-10): el TOTP se exigía únicamente en la
-- aplicación (exigirAdmin*). Las políticas *_admin usaban es_admin(), que solo
-- mira perfil_admin.activo. Un administrador con token aal1 (contraseña u OTP
-- por la API de Auth) podía hablar con PostgREST directamente y leer/escribir
-- pedidos (con datos de compradores), perfiles, bitácora y storage sin pasar
-- nunca por el código de la app.
--
-- Diseño: es_admin() NO cambia. Sigue significando "tiene perfil_admin
-- activo" y lo necesitan, con la sesión todavía en aal1:
--   · iniciarSesion (puerta del login, rpc es_admin),
--   · obtenerPerfil (lee su fila de perfil_admin),
--   · las pantallas /admin/verificar y /admin/activar-mfa.
-- Si es_admin() exigiera aal2, nadie podría llegar nunca a aal2.
-- Nueva es_admin_aal2() = es_admin() + claim aal = 'aal2'; es la que usan las
-- políticas de datos. Inscribir el factor usa la API de Auth (esquema auth, sin
-- RLS), por eso no depende de esto.
--
-- Cuerpos de las RPC de negocio: ninguna llama a es_admin() ni es ejecutable
-- por authenticated (solo service role, con exigirAdmin en la app). No hay
-- nada que cambiar ahí.
--
-- Efecto operativo: ADMIN_MFA_OBLIGATORIO=false ya no abre las lecturas con
-- sesión del panel (RLS devolvería 0 filas en aal1). Si un administrador queda
-- fuera, la salida es la reversa (supabase/reversas/), no la variable.

create or replace function public.es_admin_aal2()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2' and public.es_admin();
$$;

revoke all on function public.es_admin_aal2() from public, anon;
grant execute on function public.es_admin_aal2() to authenticated;

-- Reescribe TODAS las políticas de public y storage que llaman a es_admin(),
-- salvo las de perfil_admin (ver abajo). Dinámico a propósito: una lista a mano
-- olvida la política que se añada mañana; la aserción del final lo cierra.
do $$
declare
  p record;
  v_using text;
  v_check text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
      from pg_policies
     where schemaname in ('public', 'storage')
       and not (schemaname = 'public' and tablename = 'perfil_admin')
       and (coalesce(qual, '') like '%es_admin()%' or coalesce(with_check, '') like '%es_admin()%')
  loop
    v_using := replace(p.qual, 'es_admin()', 'es_admin_aal2()');
    v_check := replace(p.with_check, 'es_admin()', 'es_admin_aal2()');
    execute format('alter policy %I on %I.%I%s%s',
      p.policyname, p.schemaname, p.tablename,
      case when v_using is not null then format(' using (%s)', v_using) else '' end,
      case when v_check is not null then format(' with check (%s)', v_check) else '' end);
  end loop;
end
$$;

-- perfil_admin: la lectura sigue necesitando solo aal1 para la PROPIA fila
-- (obtenerPerfil la lee antes de saber si falta el segundo factor). Ver las
-- filas de los demás administradores sí exige aal2.
drop policy if exists perfil_admin_lectura_admin on public.perfil_admin;
create policy perfil_admin_lectura_admin on public.perfil_admin
  for select to authenticated
  using (public.es_admin() and (id = auth.uid() or public.es_admin_aal2()));

-- Red: si queda alguna política con es_admin() a secas fuera de perfil_admin,
-- la migración aborta entera.
do $$
declare
  v_restantes text;
begin
  select string_agg(schemaname || '.' || tablename || '.' || policyname, ', ')
    into v_restantes
    from pg_policies
   where schemaname in ('public', 'storage')
     and not (schemaname = 'public' and tablename = 'perfil_admin')
     and (coalesce(qual, '') like '%es_admin()%' or coalesce(with_check, '') like '%es_admin()%');
  if v_restantes is not null then
    raise exception 'Quedan políticas con es_admin() sin aal2: %', v_restantes;
  end if;
end
$$;
