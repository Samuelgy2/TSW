-- Portada: retira la clave inerte `cifraPendiente` del JSON de contenido_sitio.
--
-- El esquema (features/sitio/schemas.ts) y el sitio ya no la leen: una cifra sin
-- valor se oculta. En producción la fila aún la guarda, con el valor "Error".
-- Comprobado con grep el 2026-10-08: ninguna coincidencia en src/ ni scripts/.
--
-- NO se tocan `matriculas.cupos` ni `matriculas.cierre`: /matriculas, su esquema
-- Zod y el formulario de /admin/sitio todavía los leen. Quitarlos hoy dejaría la
-- página sin esos dos indicadores. Van en otra migración cuando el bloque
-- superior de Matrículas deje de depender de ellos.
--
-- Aborta si la fila no existe. Si la clave ya no está, no hace nada.
-- Una migración no tiene actor: la bitácora queda con actor_id NULL.

do $$
declare
  v_fila jsonb;
begin
  select valor into v_fila from public.contenido_sitio where clave = 'portada' for update;
  if v_fila is null then
    raise exception 'No existe la fila portada en contenido_sitio: nada que limpiar.';
  end if;

  if v_fila ? 'cifraPendiente' then
    update public.contenido_sitio set valor = valor - 'cifraPendiente' where clave = 'portada';
  end if;
end
$$;
