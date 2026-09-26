/**
 * Comprobación de la migración 19 CONTRA EL REMOTO, con la anon key.
 *
 * El SQL ya lo cruza `verificar:contenido` leyendo los archivos. Esto comprueba
 * lo que los archivos no pueden decir: que con la llave que usa el navegador la
 * lectura funciona y la escritura no.
 *
 * Por qué importa la lectura: la política de `contenido_sitio` NO menciona
 * `es_admin()`, y la razón es que `anon` no tiene EXECUTE sobre esa función. Si
 * alguien la añadiera, cada SELECT de anon moriría con 42501 y —como el
 * contenido se lee en las páginas públicas— se caería el sitio entero, igual que
 * pasó con `club` en la migración 17. Este caso lo detecta en un segundo.
 *
 * Por qué importa la escritura: la tabla no tiene ninguna política de INSERT,
 * UPDATE ni DELETE. Con RLS activo eso significa que nadie escribe salvo el
 * service_role por la RPC. Aquí se comprueba con la llave real, no leyendo el
 * esquema.
 *
 * `npm run verificar:contenido-remoto`. Crea un usuario temporal propio para ser
 * el actor de la bitácora y lo borra al terminar, confirmando el borrado por
 * consulta: es el método que prescribe CLAUDE.md, y no se abre ninguna sesión.
 */
import { cargarEnvLocal, clienteAnon, clienteServicio } from "./_comun";

cargarEnvLocal();

async function main(): Promise<void> {

  const anon = clienteAnon();
  const casos: { nombre: string; ok: boolean; detalle: string }[] = [];
  const anotar = (nombre: string, ok: boolean, detalle = "") => casos.push({ nombre, ok, detalle });

  // --- 1. Lectura con anon ----------------------------------------------------

  const lectura = await anon.from("contenido_sitio").select("clave, actualizado_en");
  anotar(
    "anon puede LEER contenido_sitio",
    lectura.error === null,
    lectura.error ? `${lectura.error.code ?? "?"}: ${lectura.error.message}` : `${lectura.data?.length ?? 0} filas`,
  );
  anotar(
    "la lectura no muere con 42501 (la política no llama a es_admin)",
    lectura.error?.code !== "42501",
    lectura.error?.code === "42501" ? "permission denied: alguien metió es_admin() en la política de anon" : "",
  );

  // --- 2. Escritura con anon --------------------------------------------------

  // `portada` es una clave válida del CHECK a propósito: si el insert fallara por
  // la lista de claves en vez de por RLS, la prueba no diría nada sobre RLS.
  const insercion = await anon
    .from("contenido_sitio")
    .insert({ clave: "portada", valor: { colado: "por anon" } });

  anotar(
    "anon NO puede insertar (no hay política de escritura)",
    insercion.error !== null,
    insercion.error ? `rechazado con ${insercion.error.code ?? "?"}` : "SE ESCRIBIÓ: hay una política de escritura que no debería existir",
  );

  const actualizacion = await anon
    .from("contenido_sitio")
    .update({ valor: { colado: "por anon" } })
    .eq("clave", "portada");

  anotar(
    "anon NO puede actualizar",
    actualizacion.error !== null || (actualizacion.count ?? 0) === 0,
    actualizacion.error ? `rechazado con ${actualizacion.error.code ?? "?"}` : "sin filas afectadas",
  );

  const borrado = await anon.from("contenido_sitio").delete().eq("clave", "portada");
  anotar(
    "anon NO puede borrar",
    borrado.error !== null || (borrado.count ?? 0) === 0,
    borrado.error ? `rechazado con ${borrado.error.code ?? "?"}` : "sin filas afectadas",
  );

  // --- 3. Las RPC no están al alcance de anon ---------------------------------

  const rpc = await anon.rpc("guardar_contenido", {
    p_actor_id: "00000000-0000-0000-0000-000000000000",
    p_clave: "portada",
    p_valor: { colado: "por anon" },
  });
  anotar(
    "anon NO puede llamar a guardar_contenido",
    rpc.error !== null,
    rpc.error ? `rechazado con ${rpc.error.code ?? "?"}` : "SE EJECUTÓ: el revoke no está en remoto",
  );

  const rpcReset = await anon.rpc("restablecer_contenido", {
    p_actor_id: "00000000-0000-0000-0000-000000000000",
    p_clave: "portada",
  });
  anotar(
    "anon NO puede llamar a restablecer_contenido",
    rpcReset.error !== null,
    rpcReset.error ? `rechazado con ${rpcReset.error.code ?? "?"}` : "SE EJECUTÓ: el revoke no está en remoto",
  );

  // --- 4. Que el sitio público sigue leyendo lo de siempre --------------------
  //
  // La migración 20 tocó las políticas de Storage. Si algo se rompió ahí, la
  // lectura de los buckets desde el cliente deja de funcionar y las fotos y los
  // PDF desaparecen del sitio. Se comprueba listando, que es lo que pasa por RLS.

  for (const bucket of ["documentos-matricula", "productos", "competencias", "sitio"]) {
    const lista = await anon.storage.from(bucket).list("", { limit: 1 });
    anotar(
      `anon puede LISTAR el bucket ${bucket}`,
      lista.error === null,
      lista.error ? lista.error.message : `${lista.data?.length ?? 0} objeto(s) visibles`,
    );
  }

  const servicio = clienteServicio();

  // --- 5. Storage con sesión de un usuario SIN rol de administrador -----------
  //
  // Autorizado por Samuel explícitamente para ESTA prueba y solo para ella (la
  // regla del proyecto es no autenticarse como una cuenta real; una cuenta
  // temporal propia, creada y borrada aquí mismo, no lo es).
  //
  // La migración 20 endureció las políticas de escritura de Storage para exigir
  // es_admin(). Lo que no está probado todavía es el caso real: no una lectura
  // de esquema, sino una sesión de verdad —token de acceso real, no el actor
  // simulado de la sección 6— intentando subir, reemplazar y borrar en los
  // cuatro buckets. Las cuatro operaciones tienen que fallar.
  //
  // Cada intento se verifica dos veces: por el resultado que devuelve la
  // llamada, y por el ESTADO REAL en el bucket leído con la service role
  // después. Hace falta la segunda: `storage.remove()` sobre un objeto que RLS
  // no deja borrar no siempre vuelve con un error —puede volver con éxito y
  // cero objetos borrados, igual que un DELETE de tabla sin filas afectadas—,
  // así que lo único que prueba de verdad que la política contuvo el borrado es
  // comprobar que el archivo sigue ahí.
  {
    const correoInvitado = `verificacion-storage-${Date.now()}@example.com`;
    const claveInvitado = `Verificacion-${Date.now()}!`;

    // Sin app_metadata.tipo: el hook de la migración 15 lo manda a
    // perfil_usuario, inactivo. Nunca tiene fila en perfil_admin, así que
    // es_admin() da falso pase lo que pase con `activo`.
    const altaInvitado = await servicio.auth.admin.createUser({
      email: correoInvitado,
      password: claveInvitado,
      email_confirm: true,
    });

    if (altaInvitado.error || !altaInvitado.data.user) {
      anotar(
        "usuario temporal SIN rol admin, creado para la prueba de Storage",
        false,
        altaInvitado.error?.message ?? "sin usuario",
      );
    } else {
      const invitadoId = altaInvitado.data.user.id;
      anotar("usuario temporal SIN rol admin, creado para la prueba de Storage", true, `id ${invitadoId.slice(0, 8)}…`);

      const esAdminInvitado = await servicio.from("perfil_admin").select("id").eq("id", invitadoId);
      anotar(
        "el usuario temporal NO tiene fila en perfil_admin",
        (esAdminInvitado.data?.length ?? 0) === 0,
        `${esAdminInvitado.data?.length ?? 0} filas`,
      );

      // Cliente nuevo y propio para esta sesión: `clienteAnon()` crea una
      // instancia fresca cada vez, así que iniciar sesión aquí no toca el
      // cliente `anon` que usaron las secciones 1 a 4.
      const sesionInvitado = clienteAnon();
      const ingreso = await sesionInvitado.auth.signInWithPassword({
        email: correoInvitado,
        password: claveInvitado,
      });

      if (ingreso.error || !ingreso.data.session) {
        // El proveedor Email de Supabase Auth lleva apagado desde antes de esta
        // sesión (docs/estado.md, paso (c) del orden de despliegue). Sin él,
        // ninguna sesión de contraseña funciona, ni la de un administrador ni
        // la de este usuario de prueba: no es un fallo de las políticas, es que
        // la puerta todavía no está abierta. Se deja constancia y no se
        // adivinan los seis casos de abajo.
        anotar(
          "inicio de sesión con el usuario temporal",
          false,
          `${ingreso.error?.message ?? "sin sesión"} — revisar si el proveedor Email de Supabase Auth sigue apagado`,
        );
      } else {
        anotar("inicio de sesión con el usuario temporal", true, "sesión obtenida");

        const PNG_1X1 = Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          "base64",
        );
        const PDF_MINIMO = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n", "utf8");

        const buckets = [
          { id: "documentos-matricula", archivo: PDF_MINIMO, tipo: "application/pdf", ext: "pdf" },
          { id: "productos", archivo: PNG_1X1, tipo: "image/png", ext: "png" },
          { id: "competencias", archivo: PNG_1X1, tipo: "image/png", ext: "png" },
          { id: "sitio", archivo: PNG_1X1, tipo: "image/png", ext: "png" },
        ] as const;

        for (const bucket of buckets) {
          const sello = Date.now();
          const rutaSemilla = `${bucket.id}/prueba-storage-semilla-${sello}.${bucket.ext}`;
          const rutaNueva = `${bucket.id}/prueba-storage-subida-${sello}.${bucket.ext}`;

          // Semilla con la service role: el intento de "reemplazar" y de
          // "borrar" necesita un objeto real que ya exista, o RLS no tendría
          // nada que negar y la prueba no distinguiría "denegado" de "no había
          // nada que tocar".
          const semilla = await servicio.storage
            .from(bucket.id)
            .upload(rutaSemilla, bucket.archivo, { contentType: bucket.tipo, upsert: true });

          if (semilla.error) {
            anotar(`${bucket.id}: se pudo sembrar el objeto de prueba (service role)`, false, semilla.error.message);
            continue;
          }

          // --- Subir ---------------------------------------------------------
          const subida = await sesionInvitado.storage
            .from(bucket.id)
            .upload(rutaNueva, bucket.archivo, { contentType: bucket.tipo });
          anotar(
            `${bucket.id}: SUBIR rechazado sin rol admin`,
            subida.error !== null,
            subida.error ? `rechazado: ${subida.error.message}` : "SE SUBIÓ: la política de INSERT no exige es_admin()",
          );
          // Ground truth: si de verdad se rechazó, el objeto no debe existir.
          const quedoSubido = await servicio.storage.from(bucket.id).download(rutaNueva);
          anotar(
            `${bucket.id}: el objeto de la subida rechazada NO existe`,
            quedoSubido.error !== null,
            quedoSubido.error ? "confirmado ausente" : "EXISTE: la subida no debería haber quedado",
          );

          // --- Reemplazar ------------------------------------------------------
          const otroPng = Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==",
            "base64",
          );
          const reemplazo = await sesionInvitado.storage
            .from(bucket.id)
            .update(rutaSemilla, bucket.id === "documentos-matricula" ? PDF_MINIMO : otroPng, { contentType: bucket.tipo });
          anotar(
            `${bucket.id}: REEMPLAZAR rechazado sin rol admin`,
            reemplazo.error !== null,
            reemplazo.error ? `rechazado: ${reemplazo.error.message}` : "SE REEMPLAZÓ: la política de UPDATE no exige es_admin()",
          );
          // Ground truth: el contenido semilla tiene que seguir intacto, byte a
          // byte. Un "sin error" de storage.update() no basta como prueba: hay
          // que comprobar que el archivo no cambió de verdad.
          const trasReemplazo = await servicio.storage.from(bucket.id).download(rutaSemilla);
          const bytesTrasReemplazo = trasReemplazo.data ? Buffer.from(await trasReemplazo.data.arrayBuffer()) : null;
          anotar(
            `${bucket.id}: el objeto semilla sigue con su contenido original`,
            bytesTrasReemplazo !== null && bytesTrasReemplazo.equals(bucket.archivo),
            trasReemplazo.error ? trasReemplazo.error.message : bytesTrasReemplazo?.equals(bucket.archivo) ? "sin cambios" : "CAMBIÓ",
          );

          // --- Borrar ----------------------------------------------------------
          await sesionInvitado.storage.from(bucket.id).remove([rutaSemilla]);
          // Ground truth, no el valor de retorno: `remove()` sobre un objeto que
          // RLS protege puede volver sin `error` y con cero objetos borrados,
          // igual que un DELETE de tabla sin filas afectadas. Lo único que
          // prueba el borrado de verdad es que el archivo YA NO esté.
          const trasBorrado = await servicio.storage.from(bucket.id).download(rutaSemilla);
          anotar(
            `${bucket.id}: BORRAR rechazado sin rol admin (el objeto sigue existiendo)`,
            trasBorrado.error === null,
            trasBorrado.error ? "YA NO EXISTE: el borrado no debería haber pasado" : "confirmado: sigue ahí",
          );

          // --- Limpieza de este bucket ------------------------------------------
          await servicio.storage.from(bucket.id).remove([rutaSemilla, rutaNueva]);
        }
      }

      // --- Limpieza del usuario temporal -------------------------------------
      const bajaInvitado = await servicio.auth.admin.deleteUser(invitadoId);
      anotar("usuario temporal SIN rol admin, eliminado", bajaInvitado.error === null, bajaInvitado.error?.message ?? "");

      const buscarInvitado = await servicio.auth.admin.listUsers();
      const sigueInvitado = (buscarInvitado.data?.users ?? []).some((u) => u.id === invitadoId);
      anotar(
        "su borrado confirmado por consulta",
        !sigueInvitado,
        sigueInvitado ? "SIGUE EXISTIENDO" : "no aparece en auth.users",
      );

      const perfilInvitado = await servicio.from("perfil_usuario").select("id").eq("id", invitadoId);
      anotar("su perfil_usuario también desapareció", (perfilInvitado.data?.length ?? 0) === 0, `${perfilInvitado.data?.length ?? 0} filas`);
    }
  }

  // --- 6. La bitácora registra el actor real ---------------------------------
  //
  // Esto necesita una escritura de verdad, y una escritura necesita un
  // `p_actor_id` que exista en `auth.users`: la FK de `evento_auditoria.actor_id`
  // rechaza un uuid inventado.
  //
  // Se hace con un USUARIO TEMPORAL PROPIO, que es el método que prescribe
  // CLAUDE.md, y no con la cuenta de Samuel: pasar su id atribuiría a él un
  // cambio que no hizo, y eso es falsear la bitácora. Crear una cuenta propia no
  // es autenticarse como nadie; aquí no se abre ninguna sesión.
  //
  // Se borra al terminar, y el borrado se confirma por consulta. El id del actor
  // se lee ANTES del borrado: al eliminar la cuenta, la FK `on delete set null`
  // deja el evento con `actor_id` en NULL (migración 16), que es lo correcto y no
  // serviría como prueba.
  const correo = `verificacion-contenido-${Date.now()}@example.com`;
  const alta = await servicio.auth.admin.createUser({
    email: correo,
    password: `Verificacion-${Date.now()}!`,
    email_confirm: true,
  });

  if (alta.error || !alta.data.user) {
    anotar("usuario temporal creado para ser el actor", false, alta.error?.message ?? "sin usuario");
  } else {
    const actorId = alta.data.user.id;
    anotar("usuario temporal creado para ser el actor", true, `id ${actorId.slice(0, 8)}…`);

    const crear = await servicio.rpc("guardar_contenido", {
      p_actor_id: actorId,
      p_clave: "tienda",
      p_valor: { beneficios: [{ id: "prueba", titulo: "Prueba de verificación", texto: "Se borra al terminar." }] },
    });
    anotar("guardar_contenido escribe (service role)", crear.error === null, crear.error?.message ?? "fila creada");

    const actualizar = await servicio.rpc("guardar_contenido", {
      p_actor_id: actorId,
      p_clave: "tienda",
      p_valor: { beneficios: [{ id: "prueba", titulo: "Prueba modificada", texto: "Se borra al terminar." }] },
    });
    anotar("guardar_contenido reemplaza la misma clave", actualizar.error === null, actualizar.error?.message ?? "fila actualizada");

    const restablecer = await servicio.rpc("restablecer_contenido", { p_actor_id: actorId, p_clave: "tienda" });
    anotar("restablecer_contenido borra la fila", restablecer.error === null, restablecer.error?.message ?? "fila borrada");

    // Los tres eventos, con el actor, ANTES de borrar la cuenta.
    const eventos = await servicio
      .from("evento_auditoria")
      .select("accion, entidad, actor_id")
      .eq("entidad", "contenido_sitio")
      .eq("actor_id", actorId)
      .order("ocurrido_en", { ascending: true });

    const acciones = (eventos.data ?? []).map((e) => e.accion);
    anotar(
      "la bitácora registró las tres escrituras con el actor real",
      eventos.error === null && acciones.length === 3,
      eventos.error ? eventos.error.message : `acciones: ${acciones.join(", ")}`,
    );
    anotar(
      "ningún evento quedó con actor_id en NULL",
      (eventos.data ?? []).every((e) => e.actor_id === actorId),
      `${(eventos.data ?? []).length} eventos con actor ${actorId.slice(0, 8)}…`,
    );

    // La fila de prueba no se queda: restablecer_contenido ya la borró, pero se
    // confirma, porque una fila colada cambiaría el contenido del sitio público.
    const restante = await anon.from("contenido_sitio").select("clave").eq("clave", "tienda");
    anotar("no queda la fila de prueba en contenido_sitio", (restante.data?.length ?? 0) === 0, `${restante.data?.length ?? 0} filas`);

    // --- Limpieza -----------------------------------------------------------
    const baja = await servicio.auth.admin.deleteUser(actorId);
    anotar("usuario temporal eliminado", baja.error === null, baja.error?.message ?? "");

    const buscar = await servicio.auth.admin.listUsers();
    const sigue = (buscar.data?.users ?? []).some((u) => u.id === actorId);
    anotar("el borrado del usuario confirmado por consulta", !sigue, sigue ? "SIGUE EXISTIENDO" : "no aparece en auth.users");

    const perfil = await servicio.from("perfil_usuario").select("id").eq("id", actorId);
    anotar("su perfil también desapareció", (perfil.data?.length ?? 0) === 0, `${perfil.data?.length ?? 0} filas`);

    // La bitácora NO se borra: sus eventos siguen ahí con el actor anonimizado.
    const tras = await servicio
      .from("evento_auditoria")
      .select("accion")
      .eq("entidad", "contenido_sitio")
      .is("actor_id", null);
    anotar(
      "los eventos siguen en la bitácora con el actor anonimizado (migración 16)",
      (tras.data?.length ?? 0) >= 3,
      `${tras.data?.length ?? 0} eventos con actor_id NULL`,
    );
  }

  // --- Reporte ----------------------------------------------------------------

  const ancho = Math.max(...casos.map((c) => c.nombre.length));
  let fallas = 0;
  console.log("");
  for (const c of casos) {
    if (!c.ok) fallas += 1;
    console.log(`${c.ok ? "  OK  " : " FALLA"}  ${c.nombre.padEnd(ancho)}  ${c.detalle}`);
  }
  console.log("");
  console.log(`Casos: ${casos.length}, fallidos: ${fallas}`);
  console.log("");

  if (fallas > 0) process.exit(1);

  console.log("VERIFICACIÓN LIMPIA contra el remoto.");
  console.log("");
  console.log("Sin comprobar aquí:");
  console.log("  · Que un usuario CON SESIÓN y sin rol de administrador no escriba en");
  console.log("    contenido_sitio. La sección 5 sí lo prueba con una sesión real, pero para");
  console.log("    Storage; para la tabla solo hay la prueba estructural (cero políticas de");
  console.log("    escritura) y la de anon, que es más fuerte en un sentido pero no la misma cosa.");
  console.log("  · Que el panel escriba de verdad: faltan la capa de lectura y la pantalla.");

}

void main();
