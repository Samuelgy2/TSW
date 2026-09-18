# TSW

Aplicativo web oficial del club deportivo TSW, escuela de BMX.

El sitio cumple cuatro funciones: publicar los documentos de matrícula para
descargar (la radicación es presencial), vender uniformes y merchandising con
pago real por Wompi, publicar competencias y resultados, y describir los
semilleros y niveles de formación.

Hay un solo rol de administrador. No existen cuentas de deportistas ni registro
público.

## Stack

- Next.js 15 (App Router) + TypeScript estricto, desplegado en Vercel.
- Supabase: PostgreSQL, Auth (correo + contraseña) y Storage.
- Acceso a datos con `@supabase/supabase-js` y `@supabase/ssr`. Nunca conexión
  directa al puerto 5432.
- Tailwind CSS 4 + Framer Motion. Zod para validación. React Hook Form.
- Resend para correo. Vercel Cron para trabajos programados.
- Sin ORM y sin librería de estado global.

Proyecto de Supabase: `gjpbcrhwppnljbxpkhrc`.

## Requisitos

- Node.js 20 o superior (probado con 22).
- npm 10 o superior.
- Docker Desktop, solo si vas a levantar Supabase en local con la CLI.

## Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Rellena los valores. Cada variable está documentada dentro del archivo. Solo la
URL y la anon key de Supabase llevan el prefijo `NEXT_PUBLIC_`; cualquier otro
secreto que lo lleve queda expuesto en el navegador.

### 3. Levantar la base de datos

**Opción A — local (necesita Docker):**

```bash
npm run db:start      # arranca Postgres, Auth, Storage y Studio
npm run db:reset      # aplica las migraciones y el seed desde cero
npm run db:types      # regenera src/lib/supabase/database.types.ts
```

`supabase start` imprime la URL de la API y las claves `anon` y `service_role`
locales; cópialas a `.env.local`. Studio queda en <http://127.0.0.1:54323>.

**Opción B — proyecto remoto:**

```bash
npx supabase link --project-ref gjpbcrhwppnljbxpkhrc
npm run db:push                       # aplica las migraciones pendientes
npm run db:push -- --include-seed     # aplica además supabase/seed.sql
npm run db:types:remote               # regenera los tipos desde el remoto
```

Las credenciales salen de *Project Settings → API* en el panel de Supabase.

### 4. Crear el usuario administrador

En este proyecto hay un único usuario y es el administrador. No existe rol
adicional: **estar autenticado equivale a ser administrador**, y las políticas
de RLS están escritas sobre esa premisa.

Por eso el registro público está cerrado. `supabase/config.toml` trae
`enable_signup = false` tanto en `[auth]` como en `[auth.email]`.

> **Ese archivo solo afecta al entorno local.** En el proyecto remoto hay que
> desactivarlo a mano: *Authentication → Providers → Email → Allow new users to
> sign up*. Si queda abierto, cualquiera con la anon key —que viaja en el
> frontend— puede registrarse y obtener control total del sitio.

El usuario se crea a mano desde el panel de Supabase: *Authentication → Users →
Add user*, con correo y contraseña, marcando el correo como confirmado.

### 5. Arrancar el sitio

```bash
npm run dev           # http://localhost:3000
```

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` | Build de producción. |
| `npm run start` | Sirve el build. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run db:start` / `db:stop` | Levanta y detiene Supabase local. |
| `npm run db:reset` | Recrea la base local con migraciones y seed. |
| `npm run db:diff` | Genera una migración a partir de los cambios hechos en Studio. |
| `npm run db:push` | Aplica las migraciones al proyecto remoto enlazado. |
| `npm run db:types` | Regenera los tipos desde la base local. |
| `npm run db:types:remote` | Regenera los tipos desde el proyecto remoto. |

## Verificación

RLS mal escrito no falla: deja pasar en silencio. Una política demasiado abierta
no lanza error, simplemente devuelve filas que no debería. Por eso hay tres
scripts que intentan violar las reglas, en `scripts/`:

```bash
npm run verificar:rls          # con la anon key: lo que un visitante puede hacer
npm run verificar:inventario   # ciclo de stock y máquina de estados
npm run verificar:auditoria    # actor, datos personales y cobertura de la bitácora
npm run verificar              # los tres, en orden
npm run advisors               # linter de seguridad y rendimiento de Supabase
```

Leen las credenciales de `.env.local`, o del entorno si no existe. Salen con
código distinto de cero si algo falla, así que sirven para CI.

Dos detalles de método que conviene no perder:

- `verificar-rls.ts` **aborta** si la variable de la anon key contiene una llave
  de servicio. Con service role todo pasa y la prueba no significaría nada.
- Una lectura bloqueada por RLS devuelve cero filas, igual que una tabla vacía.
  Por eso cada caso negativo se contrasta con un conteo hecho con service role:
  si ambos dan cero, el resultado se reporta como **INDETERMINADO**, no como
  aprobado. El seed existe justamente para que haya datos que ocultar.

Los scripts dejan la base como la encontraron: borran los pedidos que crean y
restauran el stock. La bitácora es la excepción, porque es de solo inserción.

## Estructura

```
src/
  app/
    (public)/        sitio público
    admin/           panel, protegido por middleware
    api/             route handlers
  features/
    <feature>/
      components/    UI de la feature
      queries.ts     lecturas a Supabase
      mutations.ts   escrituras (por RPC)
      schemas.ts     esquemas Zod
      types.ts
  lib/
    supabase/        clientes: server, browser, admin
    auth/            sesión del administrador
    errors/          clases de error y mapeo a respuestas HTTP
    utils/
  components/
    ui/            primitivos reutilizables (Boton, Campo, Modal, Tabs...)
    layout/        barra superior, header, footer, transición de página
    home/          secciones propias de la portada
  config/          datos del club pendientes de confirmar
  styles/
supabase/
  migrations/        SQL versionado
  seed.sql           datos de prueba (solo desarrollo)
scripts/             verificación de RLS, inventario y auditoría
```

Features: `matriculas`, `tienda`, `pedidos`, `competencias`, `niveles`, `admin`.

## Los tres clientes de Supabase

| Cliente | Dónde se usa | Clave | RLS |
| --- | --- | --- | --- |
| `lib/supabase/browser.ts` | Componentes de cliente | anon | Sí |
| `lib/supabase/server.ts` | Server Components, Server Actions, route handlers | anon + sesión | Sí |
| `lib/supabase/admin.ts` | Solo route handlers y tareas de servidor | service role | **No, la salta** |

`server.ts` y `admin.ts` importan `server-only`: si alguien los arrastra a un
componente de cliente, la compilación falla en vez de filtrar la clave.

## El panel nunca escribe directo a las tablas

Todas las escrituras administrativas pasan por una RPC de la base de datos:

| Entidad | RPC |
| --- | --- |
| `documento` | `guardar_documento` |
| `documento_version` | `publicar_documento_version` |
| `producto` | `guardar_producto` |
| `variante` | `guardar_variante` |
| `competencia` | `guardar_competencia` |
| `resultado` | `guardar_resultado` |
| `nivel` | `guardar_nivel` |
| `pedido` (estado) | `transicionar_pedido` |

Todas reciben el id del administrador como primer parámetro y lo primero que
hacen es llamar a `establecer_actor()`, que deja ese id en una variable de
sesión de Postgres. El trigger de auditoría la lee y lo guarda en
`evento_auditoria.actor_id`.

**Por qué importa:** el backend escribe con la service role key, que no lleva
identidad de usuario. `auth.uid()` devuelve NULL. Si una operación se hace con
un `INSERT` o `UPDATE` directo en lugar de su RPC, el cambio **sí** queda en la
bitácora, pero sin responsable, y la bitácora deja de servir para lo único que
sirve: saber quién rompió qué.

Las RPC solo tienen `EXECUTE` concedido a `service_role`, así que se invocan
desde route handlers con `crearClienteAdmin()`, nunca desde el navegador.

## Base de datos

Las migraciones están en `supabase/migrations/`, numeradas por marca de tiempo.
Se aplican en orden y no se editan después de haberse aplicado: para cambiar
algo, se agrega una migración nueva.

| Migración | Contenido |
| --- | --- |
| `…100000_enums_y_extensiones` | `pgcrypto`, los 4 enums, `set_actualizado_en()` |
| `…100100_tablas_catalogo` | `producto`, `variante`, `nivel` |
| `…100200_tablas_documentos` | `documento`, `documento_version`, inmutabilidad |
| `…100300_tablas_contenido` | `competencia`, `resultado`, destacado único |
| `…100400_tablas_pedidos` | `pedido`, `pedido_item`, `transaccion` |
| `…100500_auditoria` | `evento_auditoria` y el trigger genérico |
| `…100600_funciones_negocio` | referencias, inventario, estados, RPC |
| `…100700_politicas_rls` | RLS y GRANT de todas las tablas |
| `…100800_storage_buckets` | los tres buckets y sus políticas |
| `…050500_endurecer_permisos_y_indices` | correcciones de los advisors |

Reglas del modelo que conviene tener presentes:

- Todo precio es `integer` en centavos de COP. Nunca coma flotante.
- `pedido_item` copia el precio, el nombre del producto y la talla al momento de
  la compra. El total de un pedido pasado jamás se recalcula con un JOIN contra
  `variante`, porque los precios cambian.
- `pedido.total_centavos` lo mantiene un trigger sobre `pedido_item`. Es el
  monto que se firma para Wompi, y sale de la base, no de la aplicación.
  Modificar los ítems de un pedido que ya salió de `pendiente` lanza excepción.
- `pedido.referencia` es única, formato `TSW-<año>-<6 dígitos>`, generada por
  `generar_referencia_pedido()` como valor por defecto de la columna.
- `transaccion.wompi_id` tiene índice UNIQUE: es la base de la idempotencia del
  webhook de Wompi. `payload_json` guarda el evento crudo como evidencia.
- `evento_auditoria` es de solo inserción, incluso para la service role key.
  No guarda los datos de contacto del comprador (Ley 1581 de 2012) ni el
  `payload_json` de las transacciones.

### Ciclo del inventario

Tres funciones, y no se deben confundir:

| Función | `stock` | `stock_reservado` | Cuándo |
| --- | --- | --- | --- |
| `reservar_stock` | — | sube | El comprador aparta en el checkout |
| `liberar_reserva` | — | baja | Expira, se rechaza, o quita un ítem del carrito |
| `consumir_reserva` | baja | baja | El pago se confirma |

El disponible real de una variante es `stock - stock_reservado`.

Máquina de estados del pedido, que solo `transicionar_pedido()` puede mover:

```
pendiente  → pagado | rechazado | expirado
pagado     → preparando
preparando → entregado | cancelado
rechazado, expirado, entregado, cancelado → terminales
```

**Cancelar desde `preparando` no repone inventario.** Los uniformes llevan
estampado personalizado: la unidad ya se intervino y no vuelve a ser vendible.
Reponerla inflaría el stock con mercancía que no existe.

La reserva de un pedido pendiente vence a las **2 horas** (`reserva_expira_en`).
Pasado ese plazo, el cron de Vercel lo pasa a `expirado`, lo que libera las
unidades.

### Documentos de matrícula

Una versión publicada es inmutable: un trigger rechaza cualquier `UPDATE` que
no sea sobre `archivado_en`, y rechaza todo `DELETE`.

> **El panel no ofrece "editar" ni "eliminar" sobre `documento_version`.** La
> única acción es *publicar nueva versión*; cualquier otra cosa la rechaza la
> base de datos. Publicar archiva la anterior en la misma transacción, y un
> índice parcial único garantiza que solo haya una versión vigente por
> documento.

El número de versión va dentro de la ruta del archivo, así que publicar nunca
sobrescribe el PDF anterior. El orden de la operación es:

1. `siguiente_version_documento(documento_id)` devuelve el número
2. se sube el PDF a `documentos/{documento_id}/v{version}/{nombre_archivo}`
3. se llama la RPC `publicar_documento_version`

### RLS

RLS está activo en las 12 tablas y la política por defecto es negar.

- **Lectura anónima:** `producto` y `variante` activas (la variante además exige
  que su producto esté activo), `competencia` publicada, `resultado` de
  competencias publicadas, `nivel` activo, `documento` activo y su versión
  vigente.
- **Escritura anónima:** ninguna, en ninguna tabla. `anon` no tiene siquiera el
  GRANT.
- **Sin acceso anónimo de ningún tipo:** `pedido`, `pedido_item`, `transaccion`,
  `evento_auditoria` y `contador_referencia`.
- **Rol autenticado (el admin):** lectura y escritura del contenido del sitio;
  en `evento_auditoria` solo lectura; sobre `pedido` no tiene `INSERT`, porque
  los pedidos los crea el checkout público con la service role key.

`contador_referencia` tiene RLS activo y **cero políticas** a propósito: solo lo
toca `generar_referencia_pedido()`, que corre como `SECURITY DEFINER`. El
advisor de Supabase lo reporta como `rls_enabled_no_policy` a nivel INFO; es el
comportamiento buscado.

`public.establecer_actor()` es la única función sin `SET search_path`, y también
es deliberado: una función con cláusula `SET` abre un nivel de anidamiento de
GUC y Postgres revierte al salir todo lo que se cambió dentro, incluido
`app.actor_id`. Con la función desnuda el valor sobrevive hasta el final de la
transacción. Se compensa llamando a `pg_catalog.set_config` con nombre completo.
El advisor la reporta como `function_search_path_mutable`.

### Storage

Tres buckets públicos de lectura, 10 MB por archivo y tipos MIME restringidos.
La escritura es exclusiva del rol autenticado y está limitada a una carpeta raíz
por bucket.

| Bucket | Contenido | MIME | Borrado |
| --- | --- | --- | --- |
| `documentos-matricula` | PDF de matrícula | `application/pdf` | No permitido |
| `productos` | Fotos del catálogo | jpeg, png, webp, avif | Permitido |
| `competencias` | Afiches y podios | jpeg, png, webp, avif | Permitido |

> **`competencias` contiene fotos de menores de edad.** Solo se publica material
> con autorización de uso de imagen firmada por el acudiente. El control es
> documental, no técnico: la base de datos no puede comprobar que la
> autorización exista. El formulario de publicación exige confirmarlo con una
> casilla obligatoria antes de habilitar la carga
> (`autorizacion_imagen_confirmada` en el esquema Zod de competencias).

Los buckets son públicos, así que **la URL de un archivo sigue sirviendo aunque
la fila que lo referencia deje de ser visible**. Ocultar un documento del sitio
no lo retira del CDN.

## Despliegue en Vercel

1. Importa el repositorio en Vercel.
2. Carga las variables de `.env.example` en *Settings → Environment Variables*.
   `SUPABASE_SERVICE_ROLE_KEY`, las llaves de Wompi, `RESEND_API_KEY` y
   `CRON_SECRET` van solo como variables de servidor.
3. Configura el webhook de Wompi apuntando a `/api/wompi/webhook` (fase 2).
4. Programa el cron que expira reservas vencidas (fase 2).

## Convenciones

- Todo en español: interfaz, mensajes de error y comentarios de código.
- Accesibilidad real: `<button>`, `<a href>`, `<label>` asociados, área táctil
  mínima de 44 px, foco visible. Nada de `onClick` sobre `div`.
- Mobile first: todo funciona desde 360 px de ancho.
- El rojo `#D7263D` es acento, no fondo dominante. Contraste mínimo AA (4.5:1).
- Los datos que aún no existen se marcan con corchetes, `[ASÍ]`. No se inventan
  precios, fechas, nombres de riders ni estadísticas.

## Imágenes y textos pendientes

Las fotos de `/public/imagenes/` son **marcadores generados**, no material del
club: fondo azul de marca con la etiqueta de lo que va en su lugar. Se
reemplazan conservando los nombres de archivo, y hay que escribir el texto
alternativo real en cada componente que las usa.

Los textos que dependen del club —lema, teléfono, correo, dirección, horarios,
redes y las cifras de la portada— están centralizados en
[`src/config/sitio.ts`](src/config/sitio.ts). Ninguna página los escribe a mano.
Las cifras con `valor: null` se muestran como `[dato]`: la cuenta ascendente se
activa sola en cuanto se escriba un número real.

**Pendiente de esquema:** `producto` no tiene columna de imagen —solo
`competencia` tiene `imagen_path`—, así que el catálogo usa un marcador para
todos los productos. Añadir `imagen_path` a `producto` es una migración previa a
publicar fotos reales de la tienda.

## Estado actual

Fase 1 cerrada: esquema aplicado en `gjpbcrhwppnljbxpkhrc`, RLS verificado con
la anon key, ciclo de inventario probado de punta a punta, tipos generados y
seed de prueba cargado. La interfaz pública y el panel de administración se
construyen en la fase 2.

Pendiente de fase 2, anotado aquí para que no se pierda: la consulta pública de
un pedido va por route handler con la service role key, buscando por
`referencia`, y devuelve solo el estado y un resumen de las líneas — nunca los
datos de contacto del comprador. No hay política de RLS que permita a `anon`
leer `pedido`, y no debe haberla.
