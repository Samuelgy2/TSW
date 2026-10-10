# Auditoría de seguridad — TSW

Fecha: 2026-10-01 · Rama `main` (con los cambios de acceso aún sin commitear) · Revisión estática del código y de las migraciones. No hubo pruebas contra producción ni contra el remoto.

## Resumen

No encontré nada crítico ni explotable de forma directa. La arquitectura de base es sólida: toda escritura pasa por RPC con `service_role` detrás de `exigirAdmin()`, las políticas RLS exigen `es_admin()` y los secretos no están en el repositorio. Los hallazgos son de endurecimiento: **4 de severidad media y 7 de severidad baja o informativa**.

| # | Severidad | Hallazgo |
|---|---|---|
| 1 | Media | Sin cabeceras de seguridad HTTP |
| 2 | Media | El límite de intentos no frena el "password spraying" y vive en memoria |
| 3 | Media | Sin segundo factor para administradores |
| 4 | Media | El cierre por inactividad es solo del navegador |
| 5 | Baja | Buckets públicos con listado habilitado (fotos de menores) |
| 6 | Baja | `npm audit`: postcss vulnerable dentro de `next` |
| 7 | Baja | IP del cliente tomada de `x-forwarded-for` |
| 8 | Baja | `.next-check/` sin ignorar en git |
| 9 | Baja | Política de contraseñas mínima |
| 10 | Info | Correo transaccional sobre una cuenta personal de Gmail |
| 11 | Info | Usuario de prueba huérfano en Auth (documentado, no verificado) |

---

## Estado de las correcciones (actualizado)

Primera tanda: **bajas e informativas**. Las medias (1 a 4) quedan pendientes y esperan visto bueno; el 1 ya tiene las cabeceras, falta la CSP.

| # | Estado |
|---|---|
| 1 | Cabeceras puestas y comprobadas en local; **falta la CSP** y verlas en producción |
| 1 (CSP) | En **bloqueo** (solo producción), con `'unsafe-inline'` en script y style porque Next inyecta scripts en línea. Probada en un build de producción; el panel con sesión no se recorrió con la consola abierta |
| 2 | Corregido: además del conteo por `IP|correo`, 20 fallos desde una IP la bloquean 5 min |
| 3 | Implementado el TOTP obligatorio (`/admin/verificar`, `/admin/seguridad`, guardia aal2 en `exigirAdmin*`). **Pendiente de prueba con tu cuenta**. Falta la acción para quitar el factor de otro administrador |
| 4 | Implementado: cookie firmada `tsw.actividad` (HMAC, atada al usuario) que el middleware exige y renueva en `/admin/*`, con latido del navegador cada minuto. Solo administradores; probado con un usuario temporal |
| 5 | Migración escrita (`20261001130000_storage_sin_listado_publico.sql`), **sin aplicar**: la aplicas tú con `db push` |
| 6 | Sin acción: esperar parche de Next 15.x |
| 7 | Corregido: `lib/auth/ip.ts` prefiere `x-vercel-forwarded-for` y las dos copias de la función quedaron en una |
| 8 | Corregido: `/.next-check/` en `.gitignore` |
| 9 | Corregido: el mínimo de nueva contraseña sube de 10 a 12 (la ayuda del formulario también) |
| 10 | Sin acción de código: activar verificación en dos pasos en esa cuenta de Gmail |
| 11 | **Confirmado** que existe (`38a8a68f-…`, creado 2026-09-18, sin inicios de sesión). Pendiente de que lo borres o me lo autorices |

---

## Hallazgos

### 1. Sin cabeceras de seguridad HTTP — Media
`next.config.ts` no define `headers()`, el middleware no añade ninguna y no hay `vercel.json`. Faltan `Content-Security-Policy`, `frame-ancestors` / `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`.
**Riesgo:** el login y el panel se pueden incrustar en un `<iframe>` ajeno (clickjacking). Sin CSP, cualquier XSS futuro no tiene segunda barrera. Hoy no hay `dangerouslySetInnerHTML` en `src/`, así que es defensa en profundidad.
**Corrección:** añadir `headers()` en `next.config.ts` con `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` y `Permissions-Policy` mínima. La CSP conviene empezarla en `Content-Security-Policy-Report-Only`, porque Next inyecta scripts en línea y exige ajustar `script-src`.

### 2. Límite de intentos: spraying y memoria por instancia — Media
`src/lib/auth/limite.ts` cuenta por `IP|correo` y en la memoria de cada instancia.
**Riesgo:** (a) quien prueba una contraseña común contra muchos correos desde una misma IP nunca llega a 5 fallos por clave, así que no hay tope por IP; (b) en Vercel cada instancia lleva su conteo y un reinicio lo borra.
**Corrección:** añadir un contador adicional solo por IP (p. ej. 20 fallos / 15 min) y, cuando convenga, mover el conteo a una tabla de Supabase o a Upstash (ya valoradas en la conversación). Comprobar además qué límite aplica Supabase Auth por IP en el proyecto (no lo revisé).

### 3. Sin segundo factor para administradores — Media
Un administrador controla la tienda, los documentos y las fotos de menores. Hoy la contraseña es el único factor.
**Corrección:** activar MFA TOTP de Supabase Auth y exigirlo en `exigirAdmin` / `iniciarSesion` (nivel de aseguramiento `aal2`). Es el cambio de mayor impacto de esta lista.

### 4. Cierre por inactividad solo en el navegador — Media
`ExpulsorInactividad` cierra la sesión desde el cliente. La cookie de sesión no caduca por inactividad en el servidor: si alguien la copia, sigue valiendo hasta que expire el token según la configuración de Auth (no la revisé).
**Corrección:** o bien el *inactivity timeout* / *time-box sessions* de Supabase Auth (creo que requiere plan Pro; no lo verifiqué), o una cookie propia de actividad que el servidor valide.

### 5. Buckets públicos con listado habilitado — Baja
Las políticas `for select to anon, authenticated` sobre `storage.objects` (migraciones 08 y 19) permiten **listar** los nombres de los objetos por la API, no solo descargarlos si se conoce la URL. El bucket `competencias` contiene fotos de menores. Que el bucket sea público es una decisión documentada; el listado es lo que la amplifica.
**Corrección:** quitar las políticas de `select` de esos buckets. Sin ellas la URL pública sigue sirviendo el archivo, pero no se puede enumerar (sin probar contra el remoto: comprobar tras el cambio que las imágenes siguen cargando).

### 6. `npm audit`: postcss dentro de `next` — Baja
`next@15.5.25` arrastra `postcss <= 8.5.22` con 4 avisos (XSS en `</style>`, lectura de archivos `.map` por `sourceMappingURL`). Se etiqueta *high*, pero solo es explotable si se procesa CSS no confiable; aquí solo se compila el CSS propio en el build. `npm audit fix --force` propone saltar a Next 16 (cambio mayor): no lo recomiendo solo por esto.
**Corrección:** esperar una versión 15.x que actualice postcss y volver a correr `npm audit`.

### 7. IP del cliente desde `x-forwarded-for` — Baja
`ipDelCliente()` toma el primer valor de `x-forwarded-for`. En Vercel la plataforma lo establece, pero si algún día el sitio queda detrás de otro proxy o se despliega fuera de Vercel, el cliente puede falsearlo y esquivar el límite del punto 2.
**Corrección:** documentar la dependencia, o usar `x-vercel-forwarded-for` / `request.ip` si se quiere atarlo a la plataforma.

### 8. `.next-check/` sin ignorar — Baja
Aparece como sin seguimiento en `git status`; el patrón `/.next-prueba-*/` del `.gitignore` no lo cubre. Revisé su contenido y solo hay la anon key (pública), pero un `git add .` lo subiría.
**Corrección:** añadir `/.next-check/` al `.gitignore`.

### 9. Política de contraseñas mínima — Baja
El login valida 8 caracteres (solo comodidad: Auth decide) y el alta/restablecimiento exigía 10, sin más reglas ni comprobación contra contraseñas filtradas. Ya sube a 12 (ver Estado). Con MFA (punto 3) y el límite de intentos el riesgo baja bastante.
**Corrección:** mínimo de 12 en alta y restablecimiento (hecho; no en el login, para no bloquear cuentas existentes) y activar *leaked password protection* de Supabase si el plan lo permite.

### 10. Correo sobre una cuenta personal de Gmail — Info
Los enlaces de alta y recuperación salen por SMTP de Gmail con contraseña de aplicación. Quien controle esa cuenta puede ver y emitir esos correos. Está previsto pasar a Resend cuando haya dominio; hasta entonces conviene que esa cuenta tenga verificación en dos pasos.

### 11. Usuario de prueba huérfano — Info
`CLAUDE.md` menciona `verificacion-auditoria-…@tsw-verificacion.com` en Auth. **No lo verifiqué.** Si sigue ahí, borrarlo: es un dominio que nadie controla.

---

## Lo que revisé y está bien

- **Secretos:** `.env.local` está ignorado y nunca estuvo en el historial (`git log --all -- .env .env.local` vacío). La `service_role` solo se referencia en `lib/supabase/env.ts` y `features/admin/mutations.ts` (servidor). Los builds locales solo contienen la anon key. `.env.example` trae valores ficticios.
- **Autorización en acciones:** recorrí las 9 Server Actions sin guardia de sesión; todas son públicas a propósito (inicio de sesión, recuperación, verificación de código, cierre de sesión, `elegirDeporte` que solo fija una cookie de preferencia validada contra la tabla, y la consulta pública del carrito). Las demás pasan por `exigirAdmin()` / `exigirUsuario()` o `ejecutarRpc()`.
- **Separación admin / usuario:** `perfil_admin` y `perfil_usuario` aparte; `authenticated` solo tiene `select` sobre ambas tablas; todas las RPC de escritura son `service_role` únicamente.
- **RPC `security definer`:** las 70 fijan `search_path`.
- **Storage:** la escritura es solo de administrador (migración `20260925130000`), y las subidas pasan por URL firmada con verificación de firma de bytes y tamaño.
- **Redirecciones:** `destinoSeguro` y el callback de correo restringen el destino al área de cada puerta y rechazan `//`.
- **Sesión:** el middleware usa `getUser()` (valida contra Auth), y cada página y acción repite la comprobación. Mensaje único "Credenciales incorrectas." sin enumerar cuentas.
- **XSS:** sin `dangerouslySetInnerHTML`; el destino de los botones del carrusel se valida con una lista blanca.

## Fuera del alcance de esta revisión

- Configuración del panel de Supabase (Auth, caducidad de JWT, CAPTCHA, SMTP, límites) y de Vercel (variables, protección de *preview deployments*, cuál base usan).
- Que las políticas RLS del **remoto** coincidan con las migraciones (`verificar:remoto` no se ejecutó).
- Cuerpos plpgsql de las RPC (libpg_query no los cubre).
- Wompi y el webhook: aún no existen.
- Pruebas dinámicas (pentest), cabeceras reales en producción y revisión de dependencias de desarrollo.

## Orden sugerido

1. MFA para administradores (3).
2. Cabeceras de seguridad (1) y `.gitignore` (8): cambios pequeños.
3. Límite por IP (2) y quitar el listado de buckets (5).
4. El resto cuando haya dominio o plan que lo permita.
