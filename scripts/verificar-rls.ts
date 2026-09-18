/**
 * Verificación de Row Level Security con la ANON KEY.
 *
 *   npx tsx scripts/verificar-rls.ts
 *
 * RLS mal escrito no falla: deja pasar en silencio. Una política demasiado
 * abierta no lanza error, simplemente devuelve filas que no debería. La única
 * forma de saber que funciona es intentar violarla.
 *
 * Por eso cada caso que debe bloquearse se prueba sobre datos que SÍ existen, y
 * el conteo de control se hace con service role en un cliente aparte. Si con
 * service role hay 5 filas y con anon key hay 0, RLS funciona. Si ambos dan 0,
 * la prueba no prueba nada y se reporta como INDETERMINADA.
 */
import {
  Reporte,
  clienteAnon,
  clienteServicio,
  errorDe,
  esLlaveDeServicio,
  llaveAnon,
  urlProyecto,
  type Cliente,
} from "./_comun";

const PRODUCTO_DESACTIVADO = "22222222-2222-4222-8222-000000000004";
const COMPETENCIA_BORRADOR = "44444444-4444-4444-8444-000000000003";
const DOCUMENTO_DESACTIVADO = "55555555-5555-4555-8555-000000000004";
const DOCUMENTO_ACTIVO = "55555555-5555-4555-8555-000000000001";

// Tablas de las que el visitante no debe poder leer una sola fila.
type TablaCerrada = "pedido" | "pedido_item" | "transaccion" | "evento_auditoria";

/**
 * Las consultas se pasan como funciones para poder ejecutarlas dos veces: una
 * con la anon key y otra con service role, que es el conteo de control.
 * supabase-js devuelve "thenables", de ahí el PromiseLike.
 */
type Lectura = (c: Cliente) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
type Conteo = (c: Cliente) => PromiseLike<{ count: number | null }>;

async function main(): Promise<void> {
  if (esLlaveDeServicio(llaveAnon())) {
    console.error("");
    console.error("ABORTADO: NEXT_PUBLIC_SUPABASE_ANON_KEY contiene una llave de SERVICIO.");
    console.error("Con service role todo pasa y la verificación no significa nada.");
    console.error("Usa la anon key del proyecto (Project Settings → API).");
    console.error("");
    process.exit(2);
  }

  const anon = clienteAnon();
  const servicio = clienteServicio();
  const reporte = new Reporte();

  console.log(`Proyecto: ${urlProyecto()}`);
  console.log("Llave: anon (verificada)\n");
  console.log("=== DEBE BLOQUEARSE ===");

  await casoRegistro(reporte);

  for (const tabla of ["pedido", "pedido_item", "transaccion", "evento_auditoria"] as TablaCerrada[]) {
    await lecturaBloqueada(
      reporte, anon, servicio, `select sobre ${tabla}`,
      (c) => c.from(tabla).select("*"),
      (c) => c.from(tabla).select("*", { count: "exact", head: true }),
    );
  }

  await insertProducto(reporte, anon, servicio);
  await updateVariante(reporte, anon);
  await deleteCompetencia(reporte, anon, servicio);

  await lecturaBloqueada(
    reporte, anon, servicio,
    "select de variantes del producto DESACTIVADO",
    (c) => c.from("variante").select("*").eq("producto_id", PRODUCTO_DESACTIVADO),
    (c) => c.from("variante").select("*", { count: "exact", head: true }).eq("producto_id", PRODUCTO_DESACTIVADO),
  );
  await lecturaBloqueada(
    reporte, anon, servicio,
    "select de la competencia en BORRADOR",
    (c) => c.from("competencia").select("*").eq("id", COMPETENCIA_BORRADOR),
    (c) => c.from("competencia").select("*", { count: "exact", head: true }).eq("id", COMPETENCIA_BORRADOR),
  );
  await lecturaBloqueada(
    reporte, anon, servicio,
    "select de versiones del documento DESACTIVADO",
    (c) => c.from("documento_version").select("*").eq("documento_id", DOCUMENTO_DESACTIVADO),
    (c) => c.from("documento_version").select("*", { count: "exact", head: true }).eq("documento_id", DOCUMENTO_DESACTIVADO),
  );

  await updateDocumentoVersion(reporte, anon, servicio);
  await insertAuditoria(reporte, anon);

  console.log("\n=== DEBE PERMITIRSE ===");
  await lecturaPermitida(reporte, anon, servicio, "productos activos con sus variantes",
    "producto", "*, variante(*)", (f) => f.length > 0 && f.some((p) => (p as { variante: unknown[] }).variante.length > 0));
  await lecturaPermitida(reporte, anon, servicio, "competencias publicadas con sus resultados",
    "competencia", "*, resultado(*)", (f) => f.length > 0);
  await lecturaPermitida(reporte, anon, servicio, "niveles activos en su orden",
    "nivel", "id, orden", (f) => f.length > 0);
  await lecturaPermitida(reporte, anon, servicio, "documentos activos con su versión vigente",
    "documento", "*, documento_version(*)", (f) => f.length > 0);

  await descargaPdf(reporte, anon, servicio);

  reporte.cerrar("RLS");
}

/**
 * El registro público. No se intenta crear el usuario cuando la configuración
 * dice que el registro está abierto: se sabría que pasa, y quedaría un usuario
 * basura con control total del sitio. La configuración es la evidencia.
 */
async function casoRegistro(reporte: Reporte): Promise<void> {
  const nombre = "signUp() de un usuario nuevo";
  const respuesta = await fetch(`${urlProyecto()}/auth/v1/settings`, {
    headers: { apikey: llaveAnon() },
  });

  if (!respuesta.ok) {
    reporte.indeterminado(nombre, `no se pudo leer /auth/v1/settings (HTTP ${respuesta.status})`);
    return;
  }

  const ajustes = (await respuesta.json()) as { disable_signup?: boolean };

  if (ajustes.disable_signup !== true) {
    reporte.fallido(
      nombre,
      "el registro público está ABIERTO en el proyecto remoto (disable_signup=false): " +
        "cualquiera con la anon key puede crearse una cuenta y, como authenticated equivale a admin, " +
        "obtener control total. Desactívalo en Authentication → Providers → Email",
      true,
    );
    return;
  }

  const anon = clienteAnon();
  const { error } = await anon.auth.signUp({
    email: `verificacion-rls-${Date.now()}@tsw-verificacion.com`,
    password: `Verificacion-${Date.now()}!`,
  });

  if (error) reporte.aprobado(nombre, `rechazado: ${error.message}`);
  else reporte.fallido(nombre, "el registro está marcado como cerrado pero signUp() funcionó", true);
}

/** Lectura que debe devolver cero filas teniendo datos detrás. */
async function lecturaBloqueada(
  reporte: Reporte,
  anon: Cliente,
  servicio: Cliente,
  nombre: string,
  lectura: Lectura,
  conteo: Conteo,
): Promise<void> {
  const { data, error } = await lectura(anon);
  const { count } = await conteo(servicio);
  const control = count ?? 0;

  if (error) {
    reporte.aprobado(nombre, `rechazado: ${error.message}`);
    return;
  }
  const filas = (data ?? []).length;
  if (filas > 0) {
    reporte.fallido(nombre, `devolvió ${filas} fila(s) que no debería ver`, true);
    return;
  }
  if (control === 0) {
    reporte.indeterminado(nombre, "no hay filas con service role: la prueba no distingue RLS de tabla vacía");
    return;
  }
  reporte.aprobado(nombre, `0 filas con anon, ${control} con service role`);
}

async function insertProducto(reporte: Reporte, anon: Cliente, servicio: Cliente): Promise<void> {
  const nombre = "insert sobre producto";
  const slug = `intruso-${Date.now()}`;
  const { data, error } = await anon
    .from("producto")
    .insert({ nombre: "[intruso]", slug, categoria: "uniformes" })
    .select("id");

  if (error) {
    reporte.aprobado(nombre, `rechazado: ${error.message}`);
    return;
  }

  // Si entró, hay que limpiar lo que creamos y marcarlo como fallo grave.
  const creado = (data ?? [])[0] as { id: string } | undefined;
  if (creado) await servicio.from("producto").delete().eq("id", creado.id);
  reporte.fallido(nombre, "la anon key pudo crear un producto (fila creada y borrada por el script)", true);
}

async function updateVariante(reporte: Reporte, anon: Cliente): Promise<void> {
  const nombre = "update sobre variante (cambiar un precio)";
  const { data, error } = await anon
    .from("variante")
    .update({ precio_centavos: 1 })
    .eq("sku", "PRUEBA-UNIFORME-S")
    .select("id");

  if (error) reporte.aprobado(nombre, `rechazado: ${error.message}`);
  else if ((data ?? []).length === 0) reporte.aprobado(nombre, "0 filas afectadas");
  else reporte.fallido(nombre, "la anon key pudo cambiar un precio", true);
}

async function deleteCompetencia(reporte: Reporte, anon: Cliente, servicio: Cliente): Promise<void> {
  const nombre = "delete sobre competencia";
  const { count: antes } = await servicio
    .from("competencia")
    .select("*", { count: "exact", head: true });

  const { error } = await anon.from("competencia").delete().eq("estado", "publicado");

  const { count: despues } = await servicio
    .from("competencia")
    .select("*", { count: "exact", head: true });

  if (error) reporte.aprobado(nombre, `rechazado: ${error.message}`);
  else if ((antes ?? 0) === (despues ?? 0)) reporte.aprobado(nombre, `sin efecto: ${despues} competencias antes y después`);
  else reporte.fallido(nombre, `borró ${(antes ?? 0) - (despues ?? 0)} competencia(s)`, true);
}

async function updateDocumentoVersion(reporte: Reporte, anon: Cliente, servicio: Cliente): Promise<void> {
  const nombre = "update sobre documento_version (trigger de inmutabilidad)";

  const anonimo = await errorDe(() =>
    anon.from("documento_version").update({ nombre_archivo: "pirata.pdf" }).eq("documento_id", DOCUMENTO_ACTIVO),
  );

  // Con service role el bloqueo lo hace el trigger, no RLS: es la prueba de
  // que la inmutabilidad no depende de los permisos.
  const conServicio = await errorDe(() =>
    servicio.from("documento_version").update({ nombre_archivo: "pirata.pdf" }).eq("documento_id", DOCUMENTO_ACTIVO),
  );

  if (conServicio === null) {
    reporte.fallido(nombre, "el trigger de inmutabilidad NO bloqueó el update hecho con service role", true);
    return;
  }
  reporte.aprobado(
    nombre,
    anonimo === null
      ? `bloqueado por el trigger (${conServicio.slice(0, 60)})`
      : `bloqueado con anon (${anonimo.slice(0, 40)}) y por el trigger con service role`,
  );
}

async function insertAuditoria(reporte: Reporte, anon: Cliente): Promise<void> {
  const nombre = "insert directo sobre evento_auditoria";
  const error = await errorDe(() =>
    anon.from("evento_auditoria").insert({
      accion: "crear",
      entidad: "producto",
      entidad_id: "00000000-0000-4000-8000-000000000000",
    }),
  );

  if (error) reporte.aprobado(nombre, `rechazado: ${error.slice(0, 70)}`);
  else reporte.fallido(nombre, "la anon key pudo escribir en la bitácora", true);
}

/** Lectura que debe traer datos, con control de que efectivamente los hay. */
async function lecturaPermitida(
  reporte: Reporte,
  anon: Cliente,
  servicio: Cliente,
  nombre: string,
  tabla: string,
  seleccion: string,
  suficiente: (filas: unknown[]) => boolean,
): Promise<void> {
  const { data, error } = await anon.from(tabla as never).select(seleccion);
  const { count } = await servicio.from(tabla as never).select("*", { count: "exact", head: true });

  if (error) {
    reporte.fallido(nombre, `la lectura pública falló: ${error.message}`);
    return;
  }
  const filas = (data ?? []) as unknown[];
  if (suficiente(filas)) {
    reporte.aprobado(nombre, `${filas.length} fila(s) visibles de ${count ?? 0} totales`);
    return;
  }
  if ((count ?? 0) === 0) {
    reporte.indeterminado(nombre, "no hay datos en la tabla");
    return;
  }
  reporte.fallido(nombre, `esperaba ver filas y vio ${filas.length} de ${count} totales`);
}

/** Descarga de un PDF público. El objeto se sube y se borra con service role. */
async function descargaPdf(reporte: Reporte, anon: Cliente, servicio: Cliente): Promise<void> {
  const nombre = "descarga de un PDF público desde Storage";
  const ruta = `documentos/${DOCUMENTO_ACTIVO}/v1/verificacion-${Date.now()}.pdf`;
  const contenido = new Blob(["%PDF-1.4\n% archivo de prueba\n%%EOF\n"], { type: "application/pdf" });

  const subida = await servicio.storage.from("documentos-matricula").upload(ruta, contenido, {
    contentType: "application/pdf",
  });
  if (subida.error) {
    reporte.indeterminado(nombre, `no se pudo preparar el archivo: ${subida.error.message}`);
    return;
  }

  try {
    const { data, error } = await anon.storage.from("documentos-matricula").download(ruta);
    if (error) reporte.fallido(nombre, `la descarga pública falló: ${error.message}`);
    else if ((await data.text()).startsWith("%PDF")) reporte.aprobado(nombre, `${data.size} bytes descargados con anon`);
    else reporte.fallido(nombre, "el contenido descargado no es el PDF esperado");
  } finally {
    await servicio.storage.from("documentos-matricula").remove([ruta]);
  }
}

void main();
