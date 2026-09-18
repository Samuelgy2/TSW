/**
 * Verificación de la bitácora de auditoría.
 *
 *   npx tsx scripts/verificar-auditoria.ts
 *
 * Lo que se comprueba:
 *   1. Una RPC de escritura con p_actor_id conocido deja ese actor en la
 *      bitácora, no NULL. Si sale NULL, el mecanismo de app.actor_id no
 *      funciona y toda la bitácora sería anónima.
 *   2. antes_json y despues_json no llevan datos de contacto del comprador
 *      (Ley 1581 de 2012).
 *   3. Un DELETE queda registrado con la acción `eliminar`.
 *   4. Hay auditoría sobre resultado, pedido_item y transaccion.
 *
 * El actor tiene que existir en auth.users, porque evento_auditoria.actor_id es
 * una clave foránea. El script crea un usuario temporal con la API de
 * administración, lo usa y lo borra al final.
 */
import { Reporte, clienteServicio, type Cliente } from "./_comun";

const V_UNIFORME_S = "33333333-3333-4333-8333-000000000001";

const supabase: Cliente = clienteServicio();
const reporte = new Reporte();

type Evento = {
  accion: string;
  actor_id: string | null;
  entidad: string;
  entidad_id: string;
  antes_json: unknown;
  despues_json: unknown;
};

async function eventosDe(entidad: string, entidadId: string): Promise<Evento[]> {
  const { data, error } = await supabase
    .from("evento_auditoria")
    .select("accion, actor_id, entidad, entidad_id, antes_json, despues_json")
    .eq("entidad", entidad)
    .eq("entidad_id", entidadId)
    .order("ocurrido_en", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Evento[];
}

function tieneDatosDeContacto(json: unknown): string[] {
  if (json === null || typeof json !== "object") return [];
  const claves = Object.keys(json as Record<string, unknown>);
  return claves.filter((c) => ["comprador_nombre", "comprador_email", "comprador_telefono"].includes(c));
}

async function main(): Promise<void> {
  console.log("Verificación de la bitácora de auditoría (service role)\n");

  // --- Usuario temporal que hará de actor ---------------------------------
  const correo = `verificacion-auditoria-${Date.now()}@tsw-verificacion.com`;
  const { data: creado, error: errorUsuario } = await supabase.auth.admin.createUser({
    email: correo,
    password: `Verificacion-${Date.now()}!`,
    email_confirm: true,
  });

  if (errorUsuario || !creado.user) {
    console.error(`No se pudo crear el usuario temporal: ${errorUsuario?.message}`);
    process.exit(2);
  }
  const actorId = creado.user.id;
  console.log(`Actor temporal: ${actorId}\n`);

  const creados = { competencia: "", resultado: "", pedido: "", transaccion: "" };

  try {
    // --- 1. El actor llega a la bitácora ----------------------------------
    const slug = `competencia-auditoria-${Date.now()}`;
    const { data: competencia, error: errorCompetencia } = await supabase.rpc("guardar_competencia", {
      p_actor_id: actorId,
      p_titulo: "[Competencia de verificación]",
      p_slug: slug,
      p_fecha: "2026-01-01",
      p_cuerpo: "[Cuerpo de verificación.]",
      p_estado: "borrador",
    });

    if (errorCompetencia || !competencia) {
      reporte.fallido("1. la RPC de escritura funciona", errorCompetencia?.message ?? "sin fila devuelta", true);
    } else {
      creados.competencia = competencia.id;
      const eventos = await eventosDe("competencia", competencia.id);
      const creacion = eventos.find((e) => e.accion === "crear");

      if (!creacion) {
        reporte.fallido("1. la creación quedó registrada", "no hay evento `crear` para esa competencia", true);
      } else if (creacion.actor_id === actorId) {
        reporte.aprobado("1. el actor de la RPC llegó a la bitácora", `actor_id = ${actorId.slice(0, 8)}…`);
      } else {
        reporte.fallido(
          "1. el actor de la RPC llegó a la bitácora",
          `actor_id = ${creacion.actor_id ?? "NULL"}: el mecanismo de app.actor_id no está funcionando y toda la bitácora sería anónima`,
          true,
        );
      }
    }

    // --- 2. Sin datos de contacto del comprador ---------------------------
    const { data: pedido, error: errorPedido } = await supabase
      .from("pedido")
      .insert({
        comprador_nombre: "[Comprador de verificación]",
        comprador_email: "verificacion.comprador@tsw.local",
        comprador_telefono: "3000000001",
      })
      .select("id")
      .single();

    if (errorPedido || !pedido) {
      reporte.fallido("2. la bitácora no guarda datos de contacto", errorPedido?.message ?? "sin pedido", true);
    } else {
      creados.pedido = pedido.id;
      await supabase.from("pedido_item").insert({
        pedido_id: pedido.id,
        variante_id: V_UNIFORME_S,
        cantidad: 1,
        precio_unitario_centavos: 1000,
        nombre_producto: "[Uniforme de verificación]",
        talla: "S",
      });
      await supabase.rpc("reservar_stock", { p_variante_id: V_UNIFORME_S, p_cantidad: 1 });
      await supabase.rpc("transicionar_pedido", {
        p_pedido_id: pedido.id,
        p_nuevo_estado: "expirado",
        p_actor: actorId,
      });

      const eventos = await eventosDe("pedido", pedido.id);
      const filtradas = eventos.flatMap((e) => [
        ...tieneDatosDeContacto(e.antes_json),
        ...tieneDatosDeContacto(e.despues_json),
      ]);

      if (eventos.length === 0) {
        reporte.indeterminado("2. la bitácora no guarda datos de contacto", "no se registró ningún evento del pedido");
      } else if (filtradas.length === 0) {
        reporte.aprobado("2. la bitácora no guarda datos de contacto", `${eventos.length} eventos revisados, ninguna clave de contacto`);
      } else {
        reporte.fallido("2. la bitácora no guarda datos de contacto", `encontradas: ${[...new Set(filtradas)].join(", ")} (Ley 1581 de 2012)`, true);
      }

      // El actor también debe aparecer en la transición de estado.
      const cambio = eventos.find((e) => e.accion === "cambiar_estado");
      if (cambio && cambio.actor_id === actorId) {
        reporte.aprobado("2b. transicionar_pedido propaga el actor", `actor_id = ${actorId.slice(0, 8)}…`);
      } else {
        reporte.fallido("2b. transicionar_pedido propaga el actor", `actor_id = ${cambio?.actor_id ?? "sin evento cambiar_estado"}`, true);
      }
    }

    // --- 4. Auditoría sobre resultado, pedido_item y transaccion ----------
    if (creados.competencia) {
      const { data: resultado } = await supabase.rpc("guardar_resultado", {
        p_actor_id: actorId,
        p_competencia_id: creados.competencia,
        p_rider: "[Rider de verificación]",
        p_categoria: "[Categoría de verificación]",
        p_puesto: 1,
      });
      if (resultado) {
        creados.resultado = resultado.id;
        const eventos = await eventosDe("resultado", resultado.id);
        if (eventos.length > 0) reporte.aprobado("4a. hay auditoría sobre resultado", `${eventos.length} evento(s), acción ${eventos[0]?.accion}`);
        else reporte.fallido("4a. hay auditoría sobre resultado", "no se registró nada", true);
      } else {
        reporte.fallido("4a. hay auditoría sobre resultado", "no se pudo crear el resultado", true);
      }
    }

    if (creados.pedido) {
      const { data: items } = await supabase.from("pedido_item").select("id").eq("pedido_id", creados.pedido);
      const itemId = (items ?? [])[0]?.id;
      if (itemId) {
        const eventos = await eventosDe("pedido_item", itemId);
        if (eventos.length > 0) reporte.aprobado("4b. hay auditoría sobre pedido_item", `${eventos.length} evento(s), acción ${eventos[0]?.accion}`);
        else reporte.fallido("4b. hay auditoría sobre pedido_item", "no se registró nada", true);
      }

      const { data: transaccion, error: errorTransaccion } = await supabase
        .from("transaccion")
        .insert({
          pedido_id: creados.pedido,
          wompi_id: `VERIFICACION-${Date.now()}`,
          estado: "PENDING",
          monto_centavos: 1000,
          payload_json: { nota: "[evento de verificación, no viene de Wompi]" },
        })
        .select("id")
        .single();

      if (errorTransaccion || !transaccion) {
        reporte.fallido("4c. hay auditoría sobre transaccion", errorTransaccion?.message ?? "sin fila", true);
      } else {
        creados.transaccion = transaccion.id;
        const eventos = await eventosDe("transaccion", transaccion.id);
        if (eventos.length === 0) {
          reporte.fallido("4c. hay auditoría sobre transaccion", "no se registró nada", true);
        } else {
          const despues = eventos[0]?.despues_json as Record<string, unknown> | null;
          const llevaPayload = despues !== null && Object.keys(despues ?? {}).includes("payload_json");
          if (llevaPayload) reporte.fallido("4c. la auditoría de transaccion no duplica el payload", "despues_json incluye payload_json");
          else reporte.aprobado("4c. hay auditoría sobre transaccion, sin duplicar el payload", `${eventos.length} evento(s)`);
        }
      }
    }

    // --- 3. El DELETE queda registrado ------------------------------------
    if (creados.competencia) {
      // Borrar la competencia arrastra su resultado por CASCADE.
      const { error } = await supabase.from("competencia").delete().eq("id", creados.competencia);
      if (error) {
        reporte.fallido("3. el DELETE queda registrado con acción `eliminar`", `no se pudo borrar: ${error.message}`);
      } else {
        const eventos = await eventosDe("competencia", creados.competencia);
        const borrado = eventos.find((e) => e.accion === "eliminar");
        if (borrado) {
          const conservaEstado = borrado.antes_json !== null && borrado.despues_json === null;
          reporte.aprobado(
            "3. el DELETE queda registrado con acción `eliminar`",
            conservaEstado ? "antes_json con la fila, despues_json en NULL" : "registrado",
          );
          creados.competencia = "";
          creados.resultado = "";
        } else {
          reporte.fallido("3. el DELETE queda registrado con acción `eliminar`", `acciones registradas: ${eventos.map((e) => e.accion).join(", ")}`, true);
        }
      }
    }
  } finally {
    // --- Limpieza ---------------------------------------------------------
    console.log("\nLIMPIEZA");
    if (creados.transaccion) await supabase.from("transaccion").delete().eq("id", creados.transaccion);
    if (creados.pedido) await supabase.from("pedido").delete().eq("id", creados.pedido);
    if (creados.competencia) await supabase.from("competencia").delete().eq("id", creados.competencia);

    const { data: variante } = await supabase
      .from("variante")
      .select("stock, stock_reservado")
      .eq("id", V_UNIFORME_S)
      .single();
    if (variante && variante.stock_reservado > 0) {
      await supabase.rpc("liberar_reserva", { p_variante_id: V_UNIFORME_S, p_cantidad: variante.stock_reservado });
    }
    if (variante && variante.stock !== 10) {
      await supabase.from("variante").update({ stock: 10 }).eq("id", V_UNIFORME_S);
    }

    await supabase.auth.admin.deleteUser(actorId);
    console.log("  usuario temporal eliminado; los eventos que lo citaban quedan con actor_id en NULL por la FK ON DELETE SET NULL");
    console.log("  las filas de la bitácora NO se borran: es de solo inserción por diseño");
  }

  reporte.cerrar("Auditoría");
}

void main();
