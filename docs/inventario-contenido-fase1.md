# Inventario de contenido — fase 1

Fuente: `docs/contenido-tsw-por-pagina.md` (commit `73ba1f0`), contrastado con el
código de `main` (`fda5e13`) y con la base de producción (proyecto
`gjpbcrhwppnljbxpkhrc`, leída el 2026-09-30 con solo SELECT). **No se modificó
nada.** Lo que sigue es lectura, no cambios.

Hallazgo de contexto que cambia el plan: **buena parte del documento ya está en
el sitio**. Una sesión anterior cargó el documento del 22-09 (cifras de
metodología, FAQs, niveles, clubes, redes, título de pestaña, "Reglamento
interno", modo catálogo de la tienda, "Últimos resultados" oculto). Por eso la
tabla distingue "ya hecho" de "falta".

Leyenda de editable: **sí** = hay campo en el panel y respaldo en BD · **parcial**
= una parte sí, otra no · **no** = texto quemado en un componente o en
`config/*.ts` sin respaldo en BD.

---

## 1. Tabla de inventario

### Elementos globales

| Página | Sección del doc | Dónde vive hoy | ¿Editable? | Cómo lo cargaría | Notas / choques |
|---|---|---|---|---|---|
| Global | Barra superior (lema, WhatsApp, correo) | `config/sitio.ts:24` (`SITIO.lema`), `:113-115` (`CONTACTO`); `BarraSuperior.tsx` | no | Nada: ya coincide con el doc | Ya hecho. |
| Global | Botones de WhatsApp | `lib/whatsapp.ts` (único constructor) + env `NEXT_PUBLIC_WHATSAPP_NUMERO` | no (variable de entorno) | Nada en código | `.env.local` = `573227073535` ✓. **No puedo verificar el valor en Vercel**: si allí falta o está mal, el botón sale deshabilitado ("WhatsApp no configurado"). Revisar en el panel de Vercel. |
| Global | Pie: lema, afiliaciones, sedes, WhatsApp, correo, atención | `Footer.tsx`, `config/sitio.ts:44-59`, `:112-120` | no | Nada: coincide con el doc | **NIT**: el doc lo muestra ("NIT 902.072.786-0"), pero `IDENTIDAD_LEGAL.nitConfirmado = false` lo oculta porque el mismo doc pide confirmar el dígito con el RUT (Pendientes). Decisión tuya. |
| Global | Síguenos en Instagram (3 cuentas) | `config/sitio.ts:167-171` (`REDES`) | no | Nada | Ya hecho: los 3 enlaces son correctos y ya no hay íconos de Facebook/YouTube. |
| Global | SEO por página | `app/layout.tsx:28` (título Inicio ✓), `config/sitio.ts:25` (descripción Inicio), `metadata` en cada `page.tsx` | no | Editar el texto en cada archivo | Coinciden: Inicio título, Semilleros título y descripción, Matrículas título. **Difieren**: descripción de Inicio; título y descripción de Competencias ("Competencias" vs "Competencias y resultados"); descripción de Matrículas; título y descripción de Tienda ("Tienda" vs "Tienda oficial"). |

### Página de inicio

| Página | Sección del doc | Dónde vive hoy | ¿Editable? | Cómo lo cargaría | Notas / choques |
|---|---|---|---|---|---|
| Inicio | Portada: etiqueta superior | Badge 1 = `contenido_sitio.portada.etiquetaEntidad` (prod: `[Entidad deportiva]`). Badge 2 = nombres de la tabla `deporte` unidos con " · " (`HeroPortal.tsx:96`) | parcial | UPDATE de `portada.etiquetaEntidad` | El doc pide "Entidad deportiva · BMX · Habilidades motrices" en una etiqueta; hoy la segunda mitad sale de `deporte`, donde solo hay BMX activo. **Choque.** |
| Inicio | Portada: título y presentación | Con slides activos: `carrusel_slide.titulo/descripcion`. Sin slides: `SITIO.nombreLargo` + `portada.presentacion` (prod: placeholder `[Presentación…]`) | parcial | UPDATE de `portada.presentacion` | Hay 2 slides de prueba activos en prod (ver lista de datos de prueba): hoy el título que se ve es el del slide ("prueba", "inscripciones"), no el del doc. |
| Inicio | Portada: botones "Ver matrículas · Conocer los niveles" | `HeroPortal.tsx:123-128`: "Ver matrículas · Conocer los semilleros" (solo sin slides). Con slides, el botón es el del slide | no | Editar el componente (b) o dejarlo | El texto difiere ("semilleros" vs "niveles"). |
| Inicio | Portada: línea de aval | `portada.aval` (prod: sin "· Desde 2022") | sí | UPDATE de `portada.aval` | El doc añade " · Desde 2022". |
| Inicio | Tarjetas pequeñas (BMX Club TSW / BMX Mastercross / Habilidades Motrices, cada una con subtítulo) | `HeroPortal.tsx:138-166`: tarjeta "Deportes de la corporación" que lista `deporte.nombre` + `deporte.categoria` y enlaza `/semilleros?deporte=<slug>` | no | — | **Choque de modelo**: el doc habla de clubes/programa, el componente lee `deporte`. Además los subtítulos del doc ("El club de la casa", "Formación por niveles", "Personalizado, todas las edades") no coinciden con `club.etiqueta` ("El club de la casa", "Club acogido · Desde 2022", "Todas las edades · Personalizado"). |
| Inicio | Cifras (4) | `portada.cifras` (`SeccionesPortal.tsx`) | sí | UPDATE de `portada.cifras` | Campo "Cifra" ya existe (commit `3023384`, tarea aparte; no la dupliqué). Prod hoy: valores 80/4/2/100 pero con etiquetas `+80`, `4 Años de trayectoria`, `2 clubes`, `100 %` y sufijos `+`, `+`, `+`, `-`. Hay que reescribir las cuatro con etiqueta corta, valor y sufijo. La migración que dejé escrita (`20260930120000`) **ya no aplica** (exige cifras en null; alguien las editó a mano después). |
| Inicio | Nuestros pilares (4) | `portada.pilares` (array) | sí | UPDATE de `portada.pilares` | El componente no limita a 3 (`md:grid-cols-3` admite 4, pero queda 3+1). Prod ya tiene los 4 cargados a mano con defectos: título con espacio inicial, pie del pilar 3 = "Etiqueta: Reglamento interno". La nota del doc (unir 2 y 4 si solo caben 3) **no hace falta para datos**; es una decisión de diseño. |
| Inicio | Nuestros clubes y programa (título, bajada, 3 tarjetas con etiqueta, texto y 2 viñetas) | Sección "Nuestros deportes" = tabla `deporte` (`DeportesPortal`), título quemado en `SeccionesPortal.tsx:90`, bajada `portada.deportesBajada` (prod: vacía) | no | — | **Choque de modelo y de título.** La sección pinta `deporte`; el doc describe `club` (etiqueta y texto ya están en `club` y coinciden con el doc). Falta: viñetas por club (`club` no tiene `puntos`), título nuevo, enlaces a `?club=` en vez de `?deporte=`, y el enlace del pie "Nuestros deportes". |
| Inicio | Últimos resultados | `UltimosResultados.tsx` (se oculta sin resultados) | no | Nada | Ya hecho: se oculta. El texto alterno del doc no se usa. Hoy en prod no hay resultados publicados. |
| Inicio | Frase institucional | `portada.cita` {texto, autor, cargo} | sí | UPDATE de `portada.cita` | Prod: texto = el lema, autor "Dahiana Serna", cargo "Entrenadora". El doc da otra frase atribuida a "Corporación Deportiva TSW". Sobrescribir el nombre de una persona real es decisión tuya. |
| Inicio | Documentos (bajada + 3 tarjetas) | Bajada quemada en `SeccionesPortal.tsx:147` (= doc ✓). Tarjetas: tabla `documento` | parcial | UPDATE de título/descripción de los 3 documentos | Los 3 documentos de prod son de prueba, inactivos y **sin archivo en Storage**. Se puede dejar el texto listo, pero no publicar sin PDF real. |
| Inicio | Sede y atención | `portada.sedeBajada` y `portada.sede` | sí | UPDATE de `portada.sede*` | Prod con errores ("PIsta Antonio Roldan Betancur", descripción "Pista", alt vacío, bajada "Dónde entrena la corporación."). El canal de horario no lleva la frase "Los entrenamientos dependen del club y del nivel". |
| Inicio | Llamado final | `app/(public)/page.tsx:53-67` | no | — | Texto del doc difiere del quemado; los botones sí coinciden. |

### Semilleros y niveles

| Página | Sección del doc | Dónde vive hoy | ¿Editable? | Cómo lo cargaría | Notas / choques |
|---|---|---|---|---|---|
| Semilleros | Selector BMX Club TSW · BMX Mastercross · Habilidades Motrices | `SelectorClubPublico` sobre la tabla `club` (3 filas activas) | sí | Nada | **Ya hecho en /semilleros.** El "BMX / Deporte 2" que menciona la sección de ajustes es el selector de **deporte** (`SelectorDeportePublico`), hoy **apagado** (`SELECTOR_DEPORTE_PUBLICO_VISIBLE = false`) y que solo estaría en Matrículas, Tienda y Competencias. Ver decisiones. |
| Semilleros | La metodología en cifras | `contenido_sitio.semilleros` — **sin fila en prod**, cae al fallback `config/contenido.ts:195-214` | sí | Nada (fallback = doc) o guardar desde el panel | Modelo distinto al de Portada: aquí `valor` es **texto** y se pinta `etiqueta` + `valor` (ej. "14 máximo" arriba y "14" grande), no número + sufijo. Funciona, pero redundante. No la mezclo con la tarea de "Cifra". |
| Semilleros | Introducción | `semilleros/page.tsx:101` (bajada del hero, quemada) | no | — | Coincide con el doc. |
| Semilleros | Niveles BMX Club TSW (3) | Tabla `nivel` (3 filas) | sí | Nada: ya coincide | Comparé descripción, edades, cupo, horario y criterio con el doc: **coinciden**. Diferencias menores: `rango_edad` empieza en mayúscula ("De 2 años…" vs "de 2 años…"); la ficha rotula siempre "Para pasar al siguiente nivel" (`FichaNiveles.tsx:85`), mientras el doc usa "Ingreso:" en TSW nivel 3 y "Al cumplir el nivel" en Mastercross nivel 3 (hoy el prefijo "Ingreso:" va dentro del texto). |
| Semilleros | BMX Mastercross: introducción propia | No existe campo | no | — | La bajada del hero es una sola para todos los clubes. **Choque.** |
| Semilleros | Niveles BMX Mastercross (3) | Tabla `nivel` (3 filas, club Mastercross) | sí | Nada | Coinciden; los niveles 1 y 2 ya están **duplicados** del de TSW (ver decisiones sobre duplicar vs referenciar). |
| Semilleros | Habilidades Motrices | `club.descripcion` (✓ coincide) + bloque `BloquePrograma` quemado (`semilleros/page.tsx:236-240`) | parcial | Nada | Modalidad/Edades/Horario quemados = doc. |
| Semilleros | Preguntas frecuentes (6) | `semilleros.preguntas` — sin fila en prod, fallback `contenido.ts:216-253` | sí | Nada | Las 6 preguntas del fallback coinciden palabra por palabra con el doc. |
| Semilleros | Llamado final | `semilleros/page.tsx:154-172` | no | — | Coincide con el doc. |

### Matrículas

| Página | Sección del doc | Dónde vive hoy | ¿Editable? | Cómo lo cargaría | Notas / choques |
|---|---|---|---|---|---|
| Matrículas | Bloque superior (Inscripciones / Clase de prueba / Sede de radicación, cada uno con dato y texto) — reemplaza "Cupos del periodo" | `matriculas.cupos` y `matriculas.cierre` (prod: "Segun demanda ", "Todo el año") + etiquetas quemadas "Cupos disponibles", "Cierre ordinario", "Sedes de radicación" en `matriculas/page.tsx:72,83,93` | parcial | — | **Choque de estructura**: hoy son 3 indicadores con etiquetas fijas y datos distintos. El doc son 3 bloques {etiqueta, dato, texto} editables. Hay que decidir si se vuelve editable (array nuevo). Además `sr-only` "Cupos del periodo" (`:65`). |
| Matrículas | Hoja de ruta: Paso 01 | `PasosMatricula.tsx:22-30` (quemado) | no | — | El doc dice "el texto actual se mantiene". Nada. |
| Matrículas | Paso 02 | Quemado ("…de la persona responsable, e imprímelos.") + `matriculas.firmas` (prod: "Se firma a mano") | parcial | UPDATE de `matriculas.firmas` | El doc lo escribe en un solo párrafo con "acudiente" y "no se aceptan firmas digitales ni escaneadas". Parte quemada ("persona responsable") no coincide. |
| Matrículas | Paso 03 (anexos) | `matriculas.anexos` (prod: 3 distintos a los del doc) | sí | UPDATE de `matriculas.anexos` | El 4.º ("Pendiente: otros anexos") **no se publica**. `anexosPie` (prod "Documentos fisicos ") sin equivalente en el doc. |
| Matrículas | Paso 04 | Quemado (`PasosMatricula.tsx:64-86`) | no | — | Está **junto a los otros tres** en el código: el "Paso 04 fuera de lugar" del doc no se reproduce en el código actual (verificar a ojo en el navegador). Difiere en que dice "Sedes: A · B — Barrio Belén" y el doc "Dirección: A o B, barrio Belén". |
| Matrículas | Categorías de vinculación (3) | `matriculas.categorias` (prod: 2 con placeholders `[…]`), bajada `categoriasBajada` con `{deporte}` | parcial | UPDATE de `matriculas.categorias` | Cada categoría exige `etiqueta`, `titulo`, `texto`, `edades` y se pinta "Edades: …". El doc trae 3 (club/programa + "Todas las edades" + texto), sin etiqueta. Hace falta decidir cómo mapear `etiqueta` y el prefijo "Edades:". |
| Matrículas | Documentos para descargar (texto + 4 ítems) | `matriculas.documentosBajada` (prod ya dice que aplica a todos los clubes; ver nota) + tabla `documento` | parcial | UPDATE de `documentosBajada`; documentos por panel/RPC | La nota interna del "esquema" **ya no está** en el código. La autorización médica "sin versión ni fecha" era por no tener PDF; el componente ya muestra versión y fecha (`ListaDocumentos.tsx:36-40`). El 4.º ítem (autorización de imagen) es "recomendado": no existe fila. |
| Matrículas | ¿Dudas con la matrícula? | `matriculas/page.tsx:172-181` | no | — | Texto difiere del doc. |
| Matrículas | (No está en el doc) Aviso rojo "La radicación es presencial" y bajada del hero | `matriculas/page.tsx:59,104-117` | no | — | El doc no los menciona. ¿Se dejan? |

### Tienda

| Página | Sección del doc | Dónde vive hoy | ¿Editable? | Cómo lo cargaría | Notas / choques |
|---|---|---|---|---|---|
| Tienda | Cómo funciona la tienda (3 beneficios) | `contenido_sitio.tienda.beneficios` — sin fila en prod, fallback con placeholders (`contenido.ts:258-264`) | sí | INSERT/upsert de la fila `tienda` | **Choque de contenido, no de estructura**: el doc promete "envío gratis a domicilio… hasta 8 días hábiles" y "pago seguro con tarjeta o transferencia". El sitio hoy no cobra (pedido por WhatsApp) y CLAUDE.md lista envíos como pendiente con la cliente. |
| Tienda | Categorías del catálogo | `producto.categoria` (enum buso/guantes/camiseta/gorra) y `producto.club_id` (prod: todos null) | parcial | Asignar `club_id` a cada producto | "BMX Club TSW / BMX Mastercross / Marca TSW" encaja en `club_id` (nulo = marca). No hay campo de "texto de categorías". |
| Tienda | Productos (6) | Tabla `producto` + `variante` | sí | Crear 6 productos | Tallas y precios son "⚠️ por definir" (salvo gorra: "Única / ajustable"). `variante.precio_centavos` es obligatorio: **no se pueden crear variantes sin inventar precio/talla.** Decisión. |
| Tienda | Modo catálogo / "Pedir por WhatsApp" | `TIENDA_MUESTRA_PRECIOS = false` (`config/sitio.ts:149`); `ListaCarrito.tsx:10` | no | Nada | Ya hecho: es el camino menos invasivo (un interruptor, no hay que ocultar la tienda). |
| Tienda | ¿Dudas con las tallas? | `tienda/page.tsx:93-102` | no | — | El doc dice "se mantiene". Nada. |

### Competencias

| Página | Sección del doc | Dónde vive hoy | ¿Editable? | Cómo lo cargaría | Notas / choques |
|---|---|---|---|---|---|
| Competencias | Estado vacío: sin próxima competencia | `ProximaCompetencia.tsx:29-38` y `textoVacio` del contador (quemados) | no | — | Texto difiere del doc ("Próximamente, nuevas válidas…"). |
| Competencias | Estado vacío: sin resultados | `HistorialCompetencias.tsx:108` (`Sin resultados en ${anio}`) | no | — | Difiere del doc. |
| Competencias | Llamado final | `competencias/page.tsx:96-105` | no | — | Difiere (título, texto y botón "Conocer los niveles"). |
| Competencias | Plantilla de nota de competencia destacada | No existe | no | — | No es texto del sitio: es una plantilla para quien redacta. ¿Como ayuda en el formulario del panel? |

### Páginas legales

| Página | Sección del doc | Dónde vive hoy | ¿Editable? | Cómo lo cargaría | Notas / choques |
|---|---|---|---|---|---|
| Legal | Datos personales, Términos, Devoluciones | `config/legales.ts` (440 líneas, código) + `legal/plantilla.tsx` | no | Reemplazar el texto en `legales.ts` | **Choque fuerte.** El código tiene una *adaptación* que retira "cuenta de usuario" y "pago con tarjeta" (documentada en `docs/legales-cambios-para-cliente.md`, por ser falsas respecto al sitio). El doc nuevo *repone* ambas cosas. Además hay placeholders ⚠️ (dirección del RUT, fecha de publicación, pasarela de pago, término de garantía, cambios de talla). **Hoy las tres páginas son accesibles por URL y están enlazadas en el pie** (`ENLACES_LEGALES`), con aviso de borrador y `noindex`. Tu instrucción es que no estén visibles ni enlazadas. |

---

## 2. Campos no editables o con estructura incompatible (regla: esperar tu decisión)

Por cada uno: a) volverlo editable (campo en panel + BD), b) dejarlo quemado con
el texto nuevo, c) omitirlo.

**Texto quemado o metadata (no editable)**

1. SEO: descripción de Inicio; título y descripción de Competencias; descripción de Matrículas; título y descripción de Tienda. (`sitio.ts:25`, tres `page.tsx`.)
2. Botones de la portada "Conocer los niveles" (hoy "Conocer los semilleros").
3. Llamado final de Inicio (texto).
4. Llamado final de Competencias (título, texto, botón).
5. Estados vacíos de Competencias (próxima y resultados).
6. ¿Dudas con la matrícula? (texto).
7. Paso 02 (parte quemada), Paso 04 ("Dirección" vs "Sedes").
8. Introducción propia de BMX Mastercross (no hay dónde guardarla).
9. Rótulo fijo "Para pasar al siguiente nivel" frente a "Ingreso" / "Al cumplir el nivel".
10. Título "Nuestros deportes" → "Nuestros clubes y programa" y su enlace en el pie.
11. El Aviso rojo "La radicación es presencial" y la bajada del hero de Matrículas (no están en el doc).
12. Textos legales (viven en código).
13. Plantilla de nota de competencia destacada.

**Estructura incompatible**

14. **Pilares: 4 vs 3.** El componente admite 4 (queda 3+1 en escritorio). No hace falta unir el 2 y el 4; confírmame si prefieres 4 tarjetas o unir.
15. **Cifras.** Ya existe el campo "Cifra" (tarea aparte). En prod hay que reescribir las cuatro. **Metodología en cifras** usa otro modelo (texto) y no lo toqué.
16. **Bloque superior de Matrículas**: hoy 3 indicadores con etiquetas fijas; el doc son 3 bloques {etiqueta, dato, texto}.
17. **Clubes en la portada**: la tarjeta pequeña del hero y la sección "Nuestros deportes" leen `deporte`; el doc describe `club`. Además faltan viñetas por club y subtítulos propios.
18. **Categorías de vinculación**: `etiqueta` es obligatoria y `edades` se pinta con prefijo "Edades:".
19. **Etiqueta superior de la portada**: la segunda mitad sale de la tabla `deporte`.
20. **Descripción/edades/grupos "los mismos de TSW" en Mastercross**: no hay herencia; hoy están duplicados en `nivel`.
21. **Horarios por club y nivel**: sí caben (`nivel.horario` por club); coinciden con el doc.
22. **Selector "BMX / Deporte 2"** → ver decisión de modelo abajo.

### Sobre el selector "BMX / Deporte 2" (lo que me pediste decir antes de tocar `deporte`)

- **Encaja en `club`, y en `/semilleros` ya está hecho**: `club` tiene las 3 filas activas (BMX Club TSW, BMX Mastercross, Habilidades Motrices, esta última con `tipo = 'programa'`), y el selector de esa página las lista.
- El selector "BMX / Deporte 2" que nombra el doc es `SelectorDeportePublico` sobre `deporte`. Está **apagado** (`SELECTOR_DEPORTE_PUBLICO_VISIBLE = false`), así que no se ve hoy en Matrículas, Tienda ni Competencias. Y `?deporte=` no filtra ninguna consulta.
- `deporte` tiene 2 filas: `bmx` (activa) y `deporte-2` (**inactiva**, con placeholders). Mi recomendación: **no tocar `deporte`**; no convertir clubes en deportes; dejar el selector apagado; y decidir qué se hace con la fila `deporte-2` (dejarla inactiva, o borrarla).

---

## 3. Textos con ⚠️ o placeholders (NO se inventan; propongo ocultar o dejar pendiente)

| Dónde en el doc | Placeholder | Propuesta |
|---|---|---|
| Matrículas · Paso 03 | "⚠️ Pendiente: otros anexos, si los hay" | No publicar el anexo 4; publicar solo los 3 reales. |
| Matrículas · Documentos | "Recomendado agregar: Autorización de uso de imagen…" | No crear fila hasta que exista el PDF. |
| Tienda · Productos (6) | Tallas "por definir" ×5; precio "por definir" ×6 | Decisión (ver lista de decisiones). Sin precio/talla no hay `variante`. |
| Legal · Datos | `{dirección que aparece en el RUT}`, `{fecha de publicación}` | La plantilla ya omite la dirección si es null; fecha sin definir. |
| Legal · Términos | `{pasarela de pago}` | Afirma un pago que el sitio no hace hoy. |
| Legal · Devoluciones | `{término de garantía}`; "Cambios de talla: por definir" | Sin valor no se publica la cláusula. |
| Pendientes | NIT (dígito "calculado como 0"), resolución INDER, nombre exacto de la pista | NIT sigue oculto; pista: usar "Antonio Roldán Betancur" como ya está. |
| Pendientes | Fotos (portada, cada club, cada nivel, sede, productos) | No hay archivos; las imágenes quedan con marcador. |

---

## 4. Datos de prueba encontrados en producción

**Competencias** (`competencia`)

| id | título | estado | resultados | nota |
|---|---|---|---|---|
| `44444444-4444-4444-8444-000000000001` | [Competencia publicada 1 — título pendiente] | archivado | `99999999-9999-4999-8999-000000000001` ([Rider 1], puesto 1), `…0002` ([Rider 2], puesto 2) | Semilla. `resultado → competencia` es `ON DELETE CASCADE`: borrar la competencia borra sus resultados. |
| `44444444-4444-4444-8444-000000000003` | [Competencia en borrador — caso de prueba] | borrador | `99999999-9999-4999-8999-000000000003` ([Rider 3]) | Semilla. |
| `44444444-4444-4444-8444-000000000002` | **Copa antioquia** | archivado | ninguno | Es el id de la semilla "Competencia publicada 2", pero **alguien la convirtió en una competencia con foto** y autorización de imagen (2026-09-25). **No la tocaría sin que lo confirmes.** El slide "prueba" del carrusel enlaza a ella. |

**Documentos** (`documento` / `documento_version`; las 4 filas están `activo = false`, y **el bucket `documentos` está vacío**: los PDFs de prueba ni siquiera existen como archivo)

| documento | versión | archivo declarado |
|---|---|---|
| `55555555-5555-4555-8555-000000000001` [Ficha de inscripción — título pendiente] | `66666666-6666-4666-8666-000000000001` v1 | ficha-inscripcion-prueba.pdf (1 024 B) |
| `…0002` [Reglamento interno — título pendiente] | `…0002` v1 | reglamento-interno.pdf (2 048 B) |
| `…0003` [Autorización médica — título pendiente] | `…0003` v1 | autorizacion-medica.pdf (1 536 B) |
| `…0004` [Documento retirado — caso de prueba] | `…0004` v1 | documento-retirado.pdf (1 024 B) |

FK `documento_version → documento` es `RESTRICT`: para borrar un documento hay que borrar antes su versión, y las versiones son inmutables por diseño (hay que ver cómo las trata el trigger). Desactivar ya está hecho.

**Productos** (`producto` / `variante`; precios en centavos: 1000 = $10, 2000 = $20)

| producto | activo | variantes | pedidos |
|---|---|---|---|
| `22222222-2222-4222-8222-000000000001` [Uniforme oficial — nombre pendiente] | **sí** | S, M, L a 1000 ($10) | **2 ítems** del pedido de prueba |
| `…0002` [Kit de protección — nombre pendiente] | **sí** | [talla A], [talla B] a 2000 ($20) | 0 |
| `…0003` [Merchandising — nombre pendiente] | **sí** | S, M, L a 1000 ($10) | 0 |
| `…0004` [Producto retirado — caso de prueba] | no | unica a 1000 | 0 |

`pedido_item → variante` y `variante → producto` son `RESTRICT`. El producto 1 **no se puede borrar** mientras exista el pedido de prueba `TSW-2026-999001` (`77777777-7777-4777-8777-000000000001`, estado `pendiente`, $30, 2 ítems). Lo prudente es **desactivar** los productos (`activo = false`), no borrar.

**No estaban en la lista del doc, pero son de prueba**

- Carrusel: `dcebf513-0398-43d3-97a7-694cf0280a01` ("prueba") y `9dd26470-67cb-4bd7-a2ae-40e5d2bbe7fb` ("inscripciones", enlace "Ver matriculas"), ambos **activos** y con foto: son lo que hoy se ve en la portada.
- Deporte `deporte-2` (`76ef4551-114d-4e36-a320-a6833a4c9acb`), inactivo, con placeholders.
- `contenido_sitio.deportes`: respaldo heredado en JSON que nadie lee desde la migración 22.

---

## 5. Ajustes técnicos de la sección final del doc

| Ajuste | Estado real |
|---|---|
| Íconos Facebook/YouTube → 3 Instagram | **Hecho** (`sitio.ts:167`, `Footer.tsx:106-117`). |
| WhatsApp roto → `wa.me/573227073535` | **Hecho en código** (`lib/whatsapp.ts`); `.env.local` correcto. **Falta comprobar la variable en Vercel.** |
| Título de la pestaña | **Hecho** (`app/layout.tsx:28`). |
| "Paso 04" fuera de lugar | **No se reproduce en el código** (los 4 pasos están en `PasosMatricula`). Comprobar en el navegador. |
| Nota interna "el esquema" | **Hecho** (ya no aparece en el sitio público). |
| Autorización médica sin versión/fecha | **Causa: no tiene PDF**. El componente ya muestra versión y fecha cuando existe. |
| Enlace "Estatutos y reglamentos" | **Hecho**: renombrado "Reglamento interno" (`sitio.ts:200`, lleva a /matriculas). |
| Selector "BMX / Deporte 2" | Ver sección 2. |
| Tienda en modo catálogo | **Hecho** (`TIENDA_MUESTRA_PRECIOS = false`). |
| Ocultar "Últimos resultados" | **Hecho**. |
| Borrar datos de prueba | Pendiente de tu aprobación. |

---

## 6. Solapamiento con otros documentos de `docs/` (el nuevo manda)

- `contenido-pendiente-cliente.md`: lista lo que falta (NIT, dirección, nombre de pista, título de pestaña, plazo de WhatsApp, tienda). Muchos ítems ya están resueltos por este doc (título de pestaña, nombre de pista). Quedaría desactualizado.
- `legales-cambios-para-cliente.md`: explica por qué las páginas legales se adaptaron. **Contradice al doc nuevo** en cuenta de usuario y pago con tarjeta (sección 1, Legal).

---

## 7. Decisiones que necesito

1. **Clubes en la portada** (tarjetas del hero y sección "Nuestros clubes y programa"): ¿a) la sección pasa a leer `club` (haría falta columna de viñetas y subtítulo) o b) se deja `deporte` y se quema el texto nuevo?
2. **Bloque superior de Matrículas**: ¿a) array editable {etiqueta, dato, texto} en `matriculas`, o b) quemado con los 3 textos del doc?
3. **Cifras**: ¿reescribo las 4 de prod con etiqueta corta + valor + sufijo (80 "+" Deportistas, 4 "años" …)? El doc pone "4 años" y "2 clubes" como cifra: ¿sufijo " años" y " clubes", o la unidad va en la etiqueta?
4. **Pilares**: ¿4 tarjetas o unir el 2 y el 4?
5. **Tienda**: ¿publico el texto de "Envío gratis… 8 días hábiles" y "Pago seguro"? El sitio no cobra y envíos está pendiente con la cliente.
6. **Productos (6)**: ¿los creo **inactivos y sin variantes** (solo nombre, descripción, club y categoría) hasta tener precios/tallas? Es lo único que no inventa datos.
7. **Legales**: ¿mantengo la adaptación actual, cambio al texto del doc, o las dejo solo preparadas? Y **hoy están enlazadas en el pie**: ¿las quito del pie hasta tu OK (yo recomiendo quitarlas, es lo que pediste)?
8. **Datos de prueba**: ¿apruebo desactivar (no borrar) los 3 productos activos y los 2 slides de prueba, y archivar/retirar las 2 competencias semilla (1 y 3)? **"Copa antioquia": ¿la dejas?** El pedido de prueba impide borrar el producto 1.
9. **Selector de deporte**: ¿lo dejo apagado y `deporte-2` inactivo (mi recomendación)?
10. **NIT**: ¿lo publico ya (el doc lo trae) o espero al RUT?
11. **Frase institucional**: ¿reemplazo la de prod (firmada por "Dahiana Serna", entrenadora) por la del doc, atribuida a la Corporación?
12. **SEO**: ¿reescribo los títulos/descripciones de Inicio, Competencias, Matrículas y Tienda con los del doc? (La descripción de Tienda promete envío gratis; ver punto 5.)
13. **Texto quemado** (puntos 2–7 y 11 de la sección 2): por cada uno, a/b/c. Mi sugerencia: b) para todo lo que sea un llamado final o estado vacío (texto que casi no cambia), a) solo para el bloque de Matrículas y los clubes de la portada.
14. **Mastercross "los mismos de TSW"**: recomiendo **dejarlos duplicados** (hoy ya lo están, y el panel edita cada nivel por separado; la herencia exigiría un modelo nuevo).
