/**
 * Verificación del ciclo de inventario y de la máquina de estados.
 *
 *   npx tsx scripts/verificar-inventario.ts
 *
 * Usa SERVICE ROLE a propósito: simula lo que hace el backend, que es el único
 * que puede llamar estas funciones.
 *
 * Una función que resta mal no revienta: deja el stock descuadrado y eso se
 * descubre semanas después, vendiendo algo que no existe. Por eso cada
 * escenario compara números concretos antes y después.
 *
 * El script deja la base como la encontró: borra los pedidos que crea y
 * restaura el stock de las variantes que toca. Correrlo dos veces da lo mismo.
 */
import { Reporte, clienteServicio, type Cliente } from "./_comun";

/** Variantes del seed y su stock esperado al empezar y al terminar. */
const V_UNIFORME_S = "33333333-3333-4333-8333-000000000001";
const V_UNIFORME_M = "33333333-3333-4333-8333-000000000002";
const V_UNIFORME_L = "33333333-3333-4333-8333-000000000003";
const V_CONCURRENCIA = "33333333-3333-4333-8333-000000000009";

const STOCK_SEED: Record<string, number> = {
  [V_UNIFORME_S]: 10,
  [V_UNIFORME_M]: 10,
  [V_UNIFORME_L]: 4,
  [V_CONCURRENCIA]: 1,
};

type Existencias = { stock: number; reservado: number };

const supabase: Cliente = clienteServicio();
const reporte = new Reporte();
const pedidosCreados: string[] = [];

async function existencias(varianteId: string): Promise<Existencias> {
  const { data, error } = await supabase
    .from("variante")
    .select("stock, stock_reservado")
    .eq("id", varianteId)
    .single();
  if (error) throw error;
  return { stock: data.stock, reservado: data.stock_reservado };
}

function comoTexto(e: Existencias): string {
  return `stock=${e.stock} reservado=${e.reservado}`;
}

async function crearPedido(nota: string): Promise<string> {
  const { data, error } = await supabase
    .from("pedido")
    .insert({
      comprador_nombre: "[Verificación automatizada]",
      comprador_email: "verificacion@tsw.local",
      comprador_telefono: "3000000000",
      notas: nota,
    })
    .select("id")
    .single();
  if (error) throw error;
  pedidosCreados.push(data.id);
  return data.id;
}

async function agregarItem(pedidoId: string, varianteId: string, cantidad: number, talla: string) {
  return supabase.from("pedido_item").insert({
    pedido_id: pedidoId,
    variante_id: varianteId,
    cantidad,
    precio_unitario_centavos: 1000,
    nombre_producto: "[Uniforme de verificación]",
    talla,
  });
}

async function transicionar(pedidoId: string, estado: "pagado" | "rechazado" | "expirado" | "preparando" | "entregado" | "cancelado") {
  return supabase.rpc("transicionar_pedido", {
    p_pedido_id: pedidoId,
    p_nuevo_estado: estado,
  });
}

// --------------------------------------------------------------- ESCENARIOS

/** A. Reservar sube solo la reserva; liberar la devuelve. El stock no se mueve. */
async function escenarioA(): Promise<void> {
  console.log("\nA — reserva que expira");
  const inicial = await existencias(V_UNIFORME_L);

  const reserva = await supabase.rpc("reservar_stock", { p_variante_id: V_UNIFORME_L, p_cantidad: 2 });
  if (reserva.error) {
    reporte.fallido("A1 reservar_stock", reserva.error.message);
    return;
  }
  const reservado = await existencias(V_UNIFORME_L);
  if (reservado.stock === inicial.stock && reservado.reservado === inicial.reservado + 2) {
    reporte.aprobado("A1 reservar sube stock_reservado y deja stock intacto", comoTexto(reservado));
  } else {
    reporte.fallido("A1 reservar sube stock_reservado y deja stock intacto", `esperaba stock=${inicial.stock} reservado=${inicial.reservado + 2}, obtuve ${comoTexto(reservado)}`);
  }

  const liberar = await supabase.rpc("liberar_reserva", { p_variante_id: V_UNIFORME_L, p_cantidad: 2 });
  if (liberar.error) {
    reporte.fallido("A2 liberar_reserva", liberar.error.message);
    return;
  }
  const final = await existencias(V_UNIFORME_L);
  if (final.stock === inicial.stock && final.reservado === inicial.reservado) {
    reporte.aprobado("A2 liberar devuelve todo al estado inicial", comoTexto(final));
  } else {
    reporte.fallido("A2 liberar devuelve todo al estado inicial", `esperaba ${comoTexto(inicial)}, obtuve ${comoTexto(final)}`);
  }
}

/** B. Pagar convierte la reserva en venta: baja stock y reserva a la vez. */
async function escenarioB(): Promise<string> {
  console.log("\nB — reserva que se paga");
  const inicial = await existencias(V_UNIFORME_L);

  const pedidoId = await crearPedido("[B] reserva que se paga");
  await agregarItem(pedidoId, V_UNIFORME_L, 2, "L");
  await supabase.rpc("reservar_stock", { p_variante_id: V_UNIFORME_L, p_cantidad: 2 });

  const pago = await transicionar(pedidoId, "pagado");
  if (pago.error) {
    reporte.fallido("B1 transición a pagado", pago.error.message);
    return pedidoId;
  }

  const final = await existencias(V_UNIFORME_L);
  if (final.stock === inicial.stock - 2 && final.reservado === inicial.reservado) {
    reporte.aprobado("B1 pagar baja stock y devuelve stock_reservado al inicial", comoTexto(final));
  } else {
    reporte.fallido("B1 pagar baja stock y devuelve stock_reservado al inicial", `esperaba stock=${inicial.stock - 2} reservado=${inicial.reservado}, obtuve ${comoTexto(final)}`);
  }

  const { data } = await supabase.from("pedido").select("pagado_en").eq("id", pedidoId).single();
  if (data?.pagado_en) reporte.aprobado("B2 pagado_en quedó fijado", data.pagado_en);
  else reporte.fallido("B2 pagado_en quedó fijado", "sigue en NULL");

  return pedidoId;
}

/** C. El caso crítico: cancelar después de estampar no repone inventario. */
async function escenarioC(pedidoId: string): Promise<void> {
  console.log("\nC — cancelación después de estampar");
  const antes = await existencias(V_UNIFORME_L);

  const preparando = await transicionar(pedidoId, "preparando");
  if (preparando.error) {
    reporte.fallido("C1 pagado → preparando", preparando.error.message);
    return;
  }
  reporte.aprobado("C1 pagado → preparando", "sin efecto sobre el inventario");

  const cancelado = await transicionar(pedidoId, "cancelado");
  if (cancelado.error) {
    reporte.fallido("C2 preparando → cancelado", cancelado.error.message);
    return;
  }

  const despues = await existencias(V_UNIFORME_L);
  if (despues.stock === antes.stock && despues.reservado === antes.reservado) {
    reporte.aprobado("C2 cancelar NO repone stock (el uniforme ya se personalizó)", comoTexto(despues));
  } else {
    reporte.fallido("C2 cancelar NO repone stock (el uniforme ya se personalizó)", `el stock cambió de ${comoTexto(antes)} a ${comoTexto(despues)}: error de negocio, la unidad estampada no vuelve a inventario vendible`, true);
  }
}

/** D. Dos reservas simultáneas sobre la última unidad. Solo una puede ganar. */
async function escenarioD(): Promise<void> {
  console.log("\nD — sobreventa bajo concurrencia");
  const inicial = await existencias(V_CONCURRENCIA);
  if (inicial.stock - inicial.reservado !== 1) {
    reporte.indeterminado("D1 solo una de dos reservas simultáneas tiene éxito", `la variante de prueba no tiene exactamente 1 disponible (${comoTexto(inicial)})`);
    return;
  }

  const [uno, dos] = await Promise.all([
    supabase.rpc("reservar_stock", { p_variante_id: V_CONCURRENCIA, p_cantidad: 1 }),
    supabase.rpc("reservar_stock", { p_variante_id: V_CONCURRENCIA, p_cantidad: 1 }),
  ]);

  const exitos = [uno, dos].filter((r) => !r.error).length;
  const final = await existencias(V_CONCURRENCIA);

  if (exitos === 1 && final.reservado === inicial.reservado + 1) {
    reporte.aprobado("D1 solo una de dos reservas simultáneas tiene éxito", `1 éxito, 1 rechazo, ${comoTexto(final)}`);
  } else if (exitos === 2) {
    reporte.fallido("D1 solo una de dos reservas simultáneas tiene éxito", "las dos reservas pasaron: falta el FOR UPDATE y el sitio venderá lo que no tiene", true);
  } else {
    reporte.fallido("D1 solo una de dos reservas simultáneas tiene éxito", `${exitos} éxitos, ${comoTexto(final)}`);
  }

  // Devolver la unidad reservada.
  if (final.reservado > inicial.reservado) {
    await supabase.rpc("liberar_reserva", { p_variante_id: V_CONCURRENCIA, p_cantidad: final.reservado - inicial.reservado });
  }
}

/** E. La máquina de estados rechaza los saltos que no existen. */
async function escenarioE(pedidoCancelado: string): Promise<void> {
  console.log("\nE — transiciones inválidas");

  const pendiente = await crearPedido("[E] pendiente para transición inválida");
  await agregarItem(pendiente, V_UNIFORME_S, 1, "S");
  const saltoEntregado = await transicionar(pendiente, "entregado");
  if (saltoEntregado.error) reporte.aprobado("E1 pendiente → entregado rechazada", saltoEntregado.error.message.slice(0, 80));
  else reporte.fallido("E1 pendiente → entregado rechazada", "la transición se aplicó", true);

  // Un pedido que llega hasta entregado, para probar el salto desde terminal.
  const entregado = await crearPedido("[E] pedido entregado");
  await agregarItem(entregado, V_UNIFORME_M, 1, "M");
  await supabase.rpc("reservar_stock", { p_variante_id: V_UNIFORME_M, p_cantidad: 1 });
  await transicionar(entregado, "pagado");
  await transicionar(entregado, "preparando");
  await transicionar(entregado, "entregado");

  const desdeEntregado = await transicionar(entregado, "pagado");
  if (desdeEntregado.error) reporte.aprobado("E2 entregado → pagado rechazada", desdeEntregado.error.message.slice(0, 80));
  else reporte.fallido("E2 entregado → pagado rechazada", "la transición se aplicó", true);

  const desdeCancelado = await transicionar(pedidoCancelado, "preparando");
  if (desdeCancelado.error) reporte.aprobado("E3 cancelado → preparando rechazada", desdeCancelado.error.message.slice(0, 80));
  else reporte.fallido("E3 cancelado → preparando rechazada", "la transición se aplicó", true);
}

/** F. El total lo calcula la base, y un pedido cerrado no se toca. */
async function escenarioF(): Promise<void> {
  console.log("\nF — total atado a los ítems");

  const pedidoId = await crearPedido("[F] total y pedido cerrado");
  await agregarItem(pedidoId, V_UNIFORME_S, 3, "S");

  const { data: conUnItem } = await supabase.from("pedido").select("total_centavos").eq("id", pedidoId).single();
  if (conUnItem?.total_centavos === 3000) reporte.aprobado("F1 el total se recalcula al insertar una línea", "3 x 1000 = 3000");
  else reporte.fallido("F1 el total se recalcula al insertar una línea", `esperaba 3000, obtuve ${conUnItem?.total_centavos}`);

  await agregarItem(pedidoId, V_UNIFORME_M, 1, "M");
  const { data: conDos } = await supabase.from("pedido").select("total_centavos").eq("id", pedidoId).single();
  if (conDos?.total_centavos === 4000) reporte.aprobado("F2 el total se actualiza al agregar otra línea", "4000");
  else reporte.fallido("F2 el total se actualiza al agregar otra línea", `esperaba 4000, obtuve ${conDos?.total_centavos}`);

  // Cerrar el pedido y volver a intentar tocar sus líneas.
  await supabase.rpc("reservar_stock", { p_variante_id: V_UNIFORME_S, p_cantidad: 3 });
  await supabase.rpc("reservar_stock", { p_variante_id: V_UNIFORME_M, p_cantidad: 1 });
  const pago = await transicionar(pedidoId, "pagado");
  if (pago.error) {
    reporte.fallido("F3 preparación del pedido pagado", pago.error.message);
    return;
  }

  const nuevaLinea = await agregarItem(pedidoId, V_UNIFORME_L, 1, "L");
  if (nuevaLinea.error) reporte.aprobado("F3 agregar una línea a un pedido pagado se rechaza", nuevaLinea.error.message.slice(0, 80));
  else reporte.fallido("F3 agregar una línea a un pedido pagado se rechaza", "la línea entró", true);

  const cambio = await supabase.from("pedido_item").update({ cantidad: 9 }).eq("pedido_id", pedidoId);
  if (cambio.error) reporte.aprobado("F4 cambiar la cantidad de un pedido pagado se rechaza", cambio.error.message.slice(0, 80));
  else reporte.fallido("F4 cambiar la cantidad de un pedido pagado se rechaza", "el cambio se aplicó", true);
}

// ----------------------------------------------------------------- LIMPIEZA

async function limpiar(): Promise<void> {
  console.log("\nLIMPIEZA");
  for (const id of pedidosCreados) {
    const { error } = await supabase.from("pedido").delete().eq("id", id);
    if (error) console.log(`  no se pudo borrar el pedido ${id}: ${error.message}`);
  }

  for (const [varianteId, stock] of Object.entries(STOCK_SEED)) {
    const actual = await existencias(varianteId);
    if (actual.reservado !== 0) {
      await supabase.rpc("liberar_reserva", { p_variante_id: varianteId, p_cantidad: actual.reservado });
    }
    if (actual.stock !== stock) {
      await supabase.from("variante").update({ stock }).eq("id", varianteId);
    }
  }

  for (const varianteId of Object.keys(STOCK_SEED)) {
    console.log(`  ${varianteId.slice(-4)} → ${comoTexto(await existencias(varianteId))}`);
  }
}

async function main(): Promise<void> {
  console.log("Verificación del ciclo de inventario (service role)");

  await escenarioA();
  const pedidoB = await escenarioB();
  await escenarioC(pedidoB);
  await escenarioD();
  await escenarioE(pedidoB);
  await escenarioF();
  await limpiar();

  reporte.cerrar("Inventario");
}

void main();
