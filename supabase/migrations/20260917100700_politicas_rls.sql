-- ---------------------------------------------------------------------------
-- TSW — 08. Row Level Security
--
-- RLS activo en TODAS las tablas, con negación por defecto: una tabla con RLS
-- y sin políticas no deja pasar nada. Después se abre solo lo necesario.
--
-- Dos notas sobre roles:
--   · `service_role` tiene BYPASSRLS: el código de servidor pasa por encima de
--     todo esto. RLS es la red de seguridad por si la anon key queda expuesta,
--     no la puerta principal.
--   · No se usa FORCE ROW LEVEL SECURITY. El dueño de las tablas es `postgres`,
--     que es quien ejecuta los triggers SECURITY DEFINER de auditoría; forzar
--     RLS sobre el dueño rompería la bitácora.
--
-- Además de las políticas se ajustan los GRANT: Supabase concede por defecto
-- todos los privilegios a `anon` y `authenticated` sobre las tablas nuevas, y
-- dejar un GRANT de escritura que ninguna política habilita es una puerta
-- entreabierta esperando a que alguien agregue una política descuidada.
-- ---------------------------------------------------------------------------

-- --- Activación -------------------------------------------------------------

alter table public.producto            enable row level security;
alter table public.variante            enable row level security;
alter table public.nivel               enable row level security;
alter table public.documento           enable row level security;
alter table public.documento_version   enable row level security;
alter table public.competencia         enable row level security;
alter table public.resultado           enable row level security;
alter table public.pedido              enable row level security;
alter table public.pedido_item         enable row level security;
alter table public.transaccion         enable row level security;
alter table public.evento_auditoria    enable row level security;
alter table public.contador_referencia enable row level security;

-- --- Privilegios base -------------------------------------------------------

-- Se parte de cero para los dos roles del navegador.
revoke all on public.producto            from anon, authenticated;
revoke all on public.variante            from anon, authenticated;
revoke all on public.nivel               from anon, authenticated;
revoke all on public.documento           from anon, authenticated;
revoke all on public.documento_version   from anon, authenticated;
revoke all on public.competencia         from anon, authenticated;
revoke all on public.resultado           from anon, authenticated;
revoke all on public.pedido              from anon, authenticated;
revoke all on public.pedido_item         from anon, authenticated;
revoke all on public.transaccion         from anon, authenticated;
revoke all on public.evento_auditoria    from anon, authenticated;
revoke all on public.contador_referencia from anon, authenticated;

-- Público: solo lectura, y solo donde hay política que lo permita.
grant select on public.producto          to anon;
grant select on public.variante          to anon;
grant select on public.nivel             to anon;
grant select on public.documento         to anon;
grant select on public.documento_version to anon;
grant select on public.competencia       to anon;
grant select on public.resultado         to anon;

-- Administrador: lectura y escritura sobre el contenido del sitio.
grant select, insert, update, delete on public.producto          to authenticated;
grant select, insert, update, delete on public.variante          to authenticated;
grant select, insert, update, delete on public.nivel             to authenticated;
grant select, insert, update, delete on public.documento         to authenticated;
grant select, insert, update, delete on public.documento_version to authenticated;
grant select, insert, update, delete on public.competencia       to authenticated;
grant select, insert, update, delete on public.resultado         to authenticated;
-- Sin INSERT sobre `pedido`: los pedidos los crea el checkout público desde un
-- route handler con la service role key, nunca el panel. Esto además evita que
-- el DEFAULT de `referencia` intente ejecutar generar_referencia_pedido(), cuyo
-- EXECUTE está revocado para `authenticated`.
grant select, update, delete on public.pedido                    to authenticated;
grant select, insert, update, delete on public.pedido_item       to authenticated;
grant select, insert, update, delete on public.transaccion       to authenticated;

-- La bitácora se lee, no se escribe.
grant select on public.evento_auditoria to authenticated;

-- `contador_referencia` no recibe ningún privilegio: solo lo toca
-- generar_referencia_pedido(), que corre como SECURITY DEFINER.

-- ---------------------------------------------------------------------------
-- LECTURA PÚBLICA (rol anon)
-- ---------------------------------------------------------------------------

create policy producto_lectura_publica
  on public.producto for select to anon
  using (activo);

comment on policy producto_lectura_publica on public.producto is
  'El catálogo público solo muestra productos activos.';

-- Una variante activa de un producto desactivado no se ve. Sin el EXISTS,
-- retirar un producto del catálogo dejaría sus tallas y sus precios legibles.
create policy variante_lectura_publica
  on public.variante for select to anon
  using (
    activo
    and exists (
      select 1
        from public.producto p
       where p.id = variante.producto_id
         and p.activo
    )
  );

comment on policy variante_lectura_publica on public.variante is
  'Solo variantes activas de productos activos.';

create policy nivel_lectura_publica
  on public.nivel for select to anon
  using (activo);

create policy documento_lectura_publica
  on public.documento for select to anon
  using (activo);

-- Solo la versión vigente, y solo de un documento activo. El historial
-- archivado es asunto del panel; un documento desactivado no expone su PDF.
create policy documento_version_lectura_publica
  on public.documento_version for select to anon
  using (
    archivado_en is null
    and exists (
      select 1
        from public.documento d
       where d.id = documento_version.documento_id
         and d.activo
    )
  );

comment on policy documento_version_lectura_publica on public.documento_version is
  'Solo la versión vigente de documentos activos. Ojo: el bucket es público, así que la URL del archivo sigue sirviendo aunque la fila deje de ser visible.';

create policy competencia_lectura_publica
  on public.competencia for select to anon
  using (estado = 'publicado');

-- Un resultado se ve solo si su competencia está publicada. La subconsulta
-- corre con el mismo rol, así que la política de competencia también aplica.
create policy resultado_lectura_publica
  on public.resultado for select to anon
  using (
    exists (
      select 1
        from public.competencia c
       where c.id = resultado.competencia_id
         and c.estado = 'publicado'
    )
  );

comment on policy resultado_lectura_publica on public.resultado is
  'Los resultados de una competencia en borrador o archivada no son visibles.';

-- ---------------------------------------------------------------------------
-- SIN ACCESO PÚBLICO
--
-- pedido, pedido_item, transaccion, evento_auditoria y contador_referencia no
-- tienen ninguna política para anon. Con RLS activo eso significa que la anon
-- key no puede leer ni escribir una sola fila, ni siquiera contarlas.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- ADMINISTRADOR (rol authenticated)
--
-- Hay un solo usuario en el sistema y es el administrador, así que estar
-- autenticado equivale a serlo. Si algún día hay más usuarios, estas políticas
-- son el sitio donde se agrega la comprobación de rol.
-- ---------------------------------------------------------------------------

create policy producto_admin
  on public.producto for all to authenticated
  using (true) with check (true);

create policy variante_admin
  on public.variante for all to authenticated
  using (true) with check (true);

create policy nivel_admin
  on public.nivel for all to authenticated
  using (true) with check (true);

create policy documento_admin
  on public.documento for all to authenticated
  using (true) with check (true);

create policy documento_version_admin
  on public.documento_version for all to authenticated
  using (true) with check (true);

create policy competencia_admin
  on public.competencia for all to authenticated
  using (true) with check (true);

create policy resultado_admin
  on public.resultado for all to authenticated
  using (true) with check (true);

-- Tres políticas en vez de una FOR ALL, para que la ausencia de INSERT sea
-- explícita y no dependa solo de que falte el GRANT.
create policy pedido_lectura_admin
  on public.pedido for select to authenticated
  using (true);

create policy pedido_actualizacion_admin
  on public.pedido for update to authenticated
  using (true) with check (true);

create policy pedido_borrado_admin
  on public.pedido for delete to authenticated
  using (true);

comment on policy pedido_lectura_admin on public.pedido is
  'El panel consulta pedidos. Crearlos es tarea del checkout público, que corre con service role.';

create policy pedido_item_admin
  on public.pedido_item for all to authenticated
  using (true) with check (true);

create policy transaccion_admin
  on public.transaccion for all to authenticated
  using (true) with check (true);

-- Solo lectura: la bitácora la escriben los triggers, nadie la edita. Además
-- del GRANT limitado, el trigger evento_auditoria_inmutable (migración 06)
-- bloquea UPDATE y DELETE incluso para la service role key.
create policy evento_auditoria_lectura_admin
  on public.evento_auditoria for select to authenticated
  using (true);

comment on policy evento_auditoria_lectura_admin on public.evento_auditoria is
  'El administrador consulta la bitácora. No existe política de escritura para ningún rol del navegador.';
