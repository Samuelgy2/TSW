# Punto de retorno

Dónde está el proyecto al cerrar la sesión del **26-09-2026**. Lo que explica el
porqué de cada decisión está en [CLAUDE.md](../CLAUDE.md); aquí solo el estado.

## Rama

`feat/login-otp-landing`, empujada a `origin`. **36 commits por delante de
`main`**, que sigue sin tocar. El último es el que cierra la Parte G
(`feat(sitio): capa de lectura y /admin/sitio`).

Sale de `entrega/v1` y trae, en orden: migraciones 15 a 20,
la paleta nueva, el menú de clubes, `/semilleros` por club, el contenido real
del documento de la cliente, las tres páginas legales, los chequeos mecánicos y
el contenido del sitio editable desde el panel.

## Cierre de pendientes menores (2026-10-08, en `main`)

- **Hook de git**: `npm install` ejecuta `prepare` y activa `.githooks`; no falla sin `.git`.
- **SEO por club**: `/semilleros/[[...club]]` (un solo archivo sirve `/semilleros` y
  `/semilleros/<slug>`). Cada club lleva title, description y canonical propios;
  `/semilleros` muestra el club por defecto con canonical a su ruta. El middleware
  redirige `/semilleros?club=<slug>` → `/semilleros/<slug>` (301). Un slug que no
  existe o está inactivo es 404 real: lo valida `semilleros/[[...club]]/layout.tsx`
  antes de que `loading.tsx` transmita (el `loading.tsx` general se movió al grupo
  `(general)` para no envolverlo). El sitemap lista las rutas por club,
  no `/semilleros` ni las de query. `revalidarPublico` invalida también
  `/semilleros/[[...club]]`.
- **Concurrencia de `alternar_deporte_activo`**: probada en un Postgres local
  desechable (contenedor, no producción), dos conexiones `psql` sincronizadas.
  20/20 vueltas: una falla, otra pasa, queda 1 activo. Control sin el `lock`: 6/6
  vueltas dejan 0 activos (la prueba sí detecta la carrera).
- **Imagen de nivel**: ya estaba implementada (migración `nivel_imagen`, aplicada en
  remoto). Probada a nivel de RPC en local: fijar, guardar texto sin perder la
  imagen, reemplazar, quitar, ruta inválida y nivel inexistente.
- La cadena de migraciones **no se reproduce desde cero** con `supabase start`:
  las migraciones de datos (`portada_hero_texto`, `desactivar_slides_de_prueba`,
  `deporte_bmx_texto`, `clubes_datos_del_documento`, `carrusel_slides_reales`,
  `borrar_pedido_de_prueba`) esperan filas y archivos que solo existen en
  producción y abortan en una base vacía.

## Hecho

**Parte E — contenido real** (commits `5be7097`, `708341c`)

- Barra superior y pie con los datos del documento: lema, dos WhatsApp, correo, las dos pistas, barrio, horario, afiliaciones INDER y Liga, © 2026.
- `CONTACTO` sin `direccion`: la cliente da dos sedes y un barrio, no una calle. Lo que falta se oculta, nunca con corchetes visibles.
- Fuera la nota interna de formatos; ahora dice que aplican a todos los clubes y programas.
- "Últimos resultados" oculto entero cuando no hay **resultados** (no cuando no hay competencias).
- Tienda como catálogo sin precios, botón "Pedir por WhatsApp", mensaje de chat sin importes.
- `/semilleros` agrupada por club, con el programa de Habilidades Motrices ramificado por `tipo`, no por slug.

**Parte F — páginas legales** (commits `b6ff4e1`, `c80ee72`)

- Las tres existen y responden 200. `/legal/terminos` y `/legal/devoluciones` no existían y el pie ya las enlazaba.
- Texto adaptado a lo que el sitio hace: sin cuentas de deportistas, sin pago con tarjeta, con el canal de WhatsApp cubierto.
- Cada cambio respecto al borrador de la cliente está en [legales-cambios-para-cliente.md](legales-cambios-para-cliente.md), con texto original y motivo.
- Primitivo `DocumentoLegal` en `/laboratorio`; las tres páginas comparten plantilla.
- Precios fuera del payload RSC, no solo ocultos al pintar.
- Anillo de foco medido sobre build de producción: 230 elementos, 0 por debajo de 3:1.

## Interruptores

Los tres están en `src/config/sitio.ts`. Ninguno se cambia sin el dato que lo
desbloquea.

| Interruptor | Hoy | Se enciende cuando | Lo vigila |
|---|---|---|---|
| `TIENDA_MUESTRA_PRECIOS` | `false` | La cliente fije precio y tallas de los 6 productos | `verificar:payload` (que `precio_centavos` no viaje al navegador) |
| `IDENTIDAD_LEGAL.nitConfirmado` | `false` | Confirme el NIT contra el RUT | `verificar:legales` (dígito DIAN) y `verificar:payload` (que no se publique) |
| `LEGALES_APROBADAS` | `false` | Un abogado devuelva las tres páginas revisadas | `verificar:payload` (aviso de borrador + `noindex`) |

Los tres chequeos se adaptan solos al estado del interruptor: al encenderlo
exigen lo contrario, sin tocar el script.

## Orden de despliegue

El orden importa: los pasos (a) y (c) son de configuración de Supabase, no de
código, y entre ellos queda una ventana en la que cualquiera podría registrarse.

**(a) Desactivar el registro público en Supabase.** Authentication → Providers →
Email → **"Allow new users to sign up" apagado**. Va primero a propósito: el paso
(c) enciende el proveedor Email, y con el registro abierto cualquiera podría
crearse una cuenta en ese momento. Una cuenta de usuario es `authenticated`, y
hasta la migración 20 eso bastaba para escribir en los buckets.

**(b) `supabase db push` y `supabase gen types`, en el mismo paso.** Aplica las
migraciones 19 (contenido editable) y 20 (Storage solo para administradores).
Nunca uno sin el otro: los tipos regenerados sin la base al día hacen compilar
código contra funciones que no existen.

**(c) Encender el proveedor Email.** Con registro apagado (paso a) y "Confirm
email" apagado, y registrando `${NEXT_PUBLIC_SITE_URL}/admin/auth/callback` en
Authentication → URL Configuration → Redirect URLs. Esto es lo que hoy impide
entrar al panel en producción.

**(d) Mis comprobaciones contra el remoto** — **hechas el 25-09-2026**, 22 de 22 con
`npm run verificar:contenido-remoto`. Lo que cubren:

1. Lectura de `contenido_sitio` con la anon key: debe funcionar sin tocar `es_admin()`.
2. `insert` con la anon key: debe fallar (no hay política de escritura).
3. `guardar_contenido` por RPC y consulta de `evento_auditoria`: `entidad = 'contenido_sitio'` y `actor_id` no nulo.
4. Las siete políticas de escritura de Storage endurecidas, contra el remoto.

Los cuatro salieron limpios. La bitácora se probó con un **usuario temporal
propio** (`verificacion-contenido-<timestamp>@tsw-verificacion.com`), borrado al
terminar y con el borrado confirmado por consulta: tres eventos —crear,
actualizar, eliminar— con su id como actor, y los tres siguen en la bitácora con
el actor anonimizado tras borrar la cuenta (migración 16).

**Tipos regenerados** (`database.types.ts` ya conoce `contenido_sitio`,
`guardar_contenido` y `restablecer_contenido`). Con `tsc` limpio y
`verificar:parametros` en 67 casos, la capa de lectura y la pantalla ya se pueden
escribir.

**Hecho el 26-09-2026, con permiso explícito de Samuel para esa prueba**: un
usuario temporal **con sesión** y sin rol de administrador
(`verificacion-storage-<timestamp>@example.com`) intentó subir, reemplazar y
borrar en `documentos-matricula`, `productos`, `competencias` y `sitio`. Las doce
operaciones fueron rechazadas por RLS, y el resultado se comprobó leyendo el
bucket con la service role (el objeto nuevo no existe, el sembrado conserva sus
bytes, el borrado sigue ahí). La cuenta se borró y el borrado se confirmó por
consulta. Es la sección 5 de `verificar:contenido-remoto`, que queda en 48 casos.

## Para fusionar a `main`

1. `npm run verificar:completo` en **0** (build, los 7 chequeos, foco).
2. `LEGALES_APROBADAS` en **`true`**. Un texto legal sin revisar, indexado, es un documento que obliga a la corporación y que nadie aprobó.

## Pendientes

**De la cliente** — la lista redactada para ella está en
[contenido-pendiente-cliente.md](contenido-pendiente-cliente.md).

- Dígito de verificación del NIT, confirmado con el RUT.
- Dirección de notificación (la del RUT) para las páginas legales.
- Revisión de un abogado de las tres páginas, con la pregunta del art. 47 sobre bienes personalizados y de uso personal.
- Precios y tallas de los 6 productos; política de cambios de talla; término de garantía; política de envíos.
- Título de la pestaña: hoy el de su documento, con "BMX"; ¿lo cambia al sumar otros deportes?
- Formatos reales en PDF y fotos.

**Míos**

- **URL del preview de Vercel**: la rama está empujada, pero no hay CLI ni `gh` aquí. Hay que leerla del panel de Vercel o del check de GitHub. Ojo: el remoto `Samuelgy2/TSW` redirige a `tswbmxclub-support/TSW`; si el proyecto de Vercel está conectado a la cuenta vieja, puede no disparar.
- **Proveedor Email en Supabase Auth: parece encendido, falta confirmarlo.** El 26-09-2026 `signInWithPassword` funcionó con el usuario temporal de la prueba de Storage, cosa imposible con el proveedor apagado. Lo que no está comprobado: que "Allow new users to sign up" siga apagado y que `${NEXT_PUBLIC_SITE_URL}/admin/auth/callback` esté en Redirect URLs. Se mira en el panel de Supabase.
- **Datos de prueba**: los borra Samuel desde el panel, no por SQL. Son las competencias "Competencia publicada 1 y 2" con "Rider 1" y "Rider 2", los tres PDF de prueba de Matrículas y los productos con precios de $10 y $20.
- **CSP con nonces** (middleware de Next) para quitar `'unsafe-inline'` de `script-src`. La rama `csp-bloqueo` activa la CSP en bloqueo, pero con `'unsafe-inline'`, que deja casi sin efecto la protección contra XSS.
- **Probar la rama `csp-bloqueo` en local** con el checklist (subida de imágenes, QR del MFA, panel) antes de hacer merge a `main`.
- **Actualización controlada de dependencias** (postcss en next, eslint-config-next); nunca `npm audit fix --force`.
- **Seguridad, de la auditoría del 2026-10-10 (rama `seguridad-aal2`)**:
  - Hecho el 2026-10-10: `20261010120000_rls_admin_exige_aal2.sql` aplicada y `npm run verificar:aal2` limpio (reversa, si hace falta: `supabase/reversas/20261010120000_revertir_rls_aal2.sql.borrador`). Con ella, `ADMIN_MFA_OBLIGATORIO=false` ya no abre las lecturas del panel: la salida de emergencia es la reversa.
  - Separar la clave HMAC de la actividad de la service role: variable propia (p. ej. `ACTIVIDAD_HMAC_SECRET`), en `.env.local` y Vercel.
  - Punto de inactividad en las Server Actions: hoy el cierre por inactividad se decide en el navegador/middleware; falta comprobarlo también al ejecutar cada acción.
- **Endurecer funciones (migración `20261010130000_endurecer_funciones.sql`, escrita y probada en BEGIN/ROLLBACK, sin aplicar)**: revoca EXECUTE de `siguiente_version_documento` a authenticated, fija `search_path` y revoca `rls_auto_enable`. Pendiente posterior a aal2: **mover los helpers RLS (`es_admin`, `es_admin_aal2`, `es_usuario`) a un esquema privado**; hoy son ejecutables por authenticated porque las políticas los llaman.

## Trampas del entorno

- **`python - <<'FIN'` cuelga para siempre** en este Git Bash: se queda esperando stdin, la tarea pasa a segundo plano y no imprime nada. Dos de esos procesos fueron lo que parecía "un bucle iterando en el proyecto". Escribir el script a un archivo y ejecutarlo.
- **`next dev` y `next start` se pisan si comparten carpeta de salida.** Resuelto: `distDir` sale de `NEXT_DIST_DIR` y los chequeos usan `.next-verificar` (start) y `.next-verificar-dev` (dev). Por eso el build puede ir primero en `verificar:completo` y por eso los chequeos ya no rompen un `npm run dev` abierto.
- **Build intermitente: sin reproducir.** Falló una vez con `Export encountered an error on /admin`; 5 corridas limpias después. No está arreglado, está sin reproducir. Detalle e hipótesis —dos procesos escribiendo el mismo `.next`, que es justo lo que el punto anterior evita— en [build-intermitente.log](build-intermitente.log).
- Añadir un archivo a un barrel con el dev encendido rompe el bundle con `__webpack_modules__[moduleId] is not a function`. No es import circular: reiniciar.

## Parte G — bloque de lectura y `/admin/sitio` cerrado

Migraciones 19 y 20 **aplicadas a remoto** (20 migraciones, confirmado por
`list_migrations` y por `npm run verificar:contenido-remoto`, 48 casos con un
usuario temporal sin rol admin fallando las cuatro operaciones de Storage en los
cuatro buckets — ver más arriba).

- **19** `contenido_sitio`: una fila por sección en jsonb, clave con lista
  cerrada, RLS con lectura pública y **cero políticas de escritura**,
  `guardar_contenido` y `restablecer_contenido`, y el bucket `sitio` (PNG, JPEG y
  WebP; sin SVG ni AVIF) con escritura que exige `es_admin()`.
- **20** endurece las siete políticas de escritura de Storage de la migración 09
  para que exijan `es_admin()`.

**Capa de lectura** (`src/features/sitio/queries.ts`, la ruta que
`verificar:contenido` vigila): `obtenerDeportes/Portada/Matriculas/Semilleros/
Tienda()`, cada una con `safeParse` contra el esquema Zod de
`features/sitio/schemas.ts` y caída al valor de `config/contenido.ts` si la fila
no existe, no valida o la consulta falla. Las cinco páginas públicas que antes
importaban las constantes fijas (`/`, `/matriculas`, `/semilleros`, `/tienda`,
`/competencias`, más `HeroPortal`, `SeccionesPortal`, `PasosMatricula`,
`deporte-publico.ts`) pasan a recibir el contenido como prop, resuelto una vez
por página. `datos-de-muestra.ts` (el módulo `/cuenta`, apagado) se dejó igual a
propósito: es su propio scaffolding de borrar-al-conectar-la-base.

`MATRICULAS.categoriasBajada` dejó de ser una función —no serializable en
jsonb— y pasó a una plantilla `"…en {deporte}."` que interpola
`features/sitio/textos.ts`.

**`/admin/sitio`**: cinco pestañas (una por sección), con quién editó cada una
por última vez y cuándo (de la bitácora, vía
`features/admin/queries-contenido.ts`), reemplazo total al guardar (mismo
esquema Zod en cliente y servidor), restablecer con modal de confirmación, y
subida de imágenes al bucket `sitio` con tipo y tamaño comprobados antes de
subir (el primitivo `Archivo`, que ya lo hacía) y otra vez en el servidor por
firma de bytes.

`npm run verificar:completo` limpio con todo esto dentro: build, los 7 chequeos
(`verificar:parametros` ahora en 71 casos, cubriendo `guardar_contenido` y
`restablecer_contenido`), y `verificar:foco`.

`TIENDA_MUESTRA_PRECIOS` y `LEGALES_APROBADAS` **no** pasaron a la configuración
editable, a propósito: el primero se enciende una vez en la vida del proyecto, y
el segundo es una puerta de cumplimiento legal que debe exigir un commit.

### Barreras nuevas de esta sesión

- **`.claude/settings.json`** (checked in): `permissions.deny` bloquea
  `supabase db push/reset/migration repair`, `npm run db:push*`,
  `git push --force*`, `git reset --hard*`, `rm -rf*`. Esos los corre Samuel.
- **Regla en CLAUDE.md**: nunca `python -c`, `node -e` ni heredocs con lógica
  dentro; todo script de un solo uso va primero a un archivo en `scripts/tmp/`
  (gitignorado) y se ejecuta desde ahí. Nació de tres fallos reales de esta
  sesión (sustitución de comandos por una comilla invertida sin querer, un
  `\b` de regex colado como carácter de retroceso, un `python -` con heredoc
  colgado para siempre).
- **Dominio de los usuarios temporales de verificación**: `@example.com`
  (RFC 2606) en vez de `@tsw-verificacion.com`, que nadie registró. Cambiado en
  la regla de CLAUDE.md y en los scripts que CREAN cuentas nuevas
  (`verificar-auditoria.ts`, `verificar-contenido-remoto.ts`, `verificar-rls.ts`).
  **No** se tocó la migración 13 (ya aplicada, cita el dominio viejo en el SQL
  de una siembra histórica) ni el chequeo que valida ese SQL contra el archivo
  real (`verificar-perfiles.mjs`): cambiar ahí habría hecho que el chequeo
  fallara contra una migración que sigue siendo correcta.

## Carga del contenido definitivo (fase 2, 30-09-2026)

Fuente: [contenido-tsw-por-pagina.md](contenido-tsw-por-pagina.md); inventario en
`inventario-contenido-fase1.md`.

- **Los cambios hechos por migración de datos dejan `actor_id` NULL en la
  bitácora**, igual que la siembra de clubes: una migración no tiene actor. Es
  esperado, no un fallo. Lo que se edite desde el panel sí lleva actor.
- Cada migración de datos de este bloque compara el valor actual de producción
  con el leído antes de escribir y aborta sin escribir si difiere.
- `supabase/pendientes/*.pendiente` son migraciones escritas que NO deben
  aplicarse todavía (un `db push` no las ve). Vuelven a `supabase/migrations/`
  con timestamp nuevo cuando se verifique lo que las precede.
- **Limpieza de claves en `contenido_sitio`:**
  - `portada.cifraPendiente`: escrita, sin aplicar —
    `20261008120000_portada_quitar_cifra_pendiente.sql`. Ningún código la lee
    (grep 2026-10-08). En producción la fila aún la guarda, con el valor "Error".
  - `matriculas.cupos` y `matriculas.cierre`: **siguen en uso** (`/matriculas`,
    `features/sitio/schemas.ts`, `SitioAdmin.tsx`, `config/contenido.ts`), así
    que no se limpian. Solo cuando el bloque superior de Matrículas pase a ser
    un array editable.
