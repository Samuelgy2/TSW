-- Carrusel: el botón de una diapositiva puede apuntar a WhatsApp.
--
-- El CHECK original (migración 21) solo admite rutas internas y anclas, "nunca
-- una URL externa: el carrusel es de la portada propia, no un espacio de
-- publicidad de terceros". Esa regla se mantiene. Lo único que se añade es un
-- enlace de WhatsApp de Colombia con el formato exacto `https://wa.me/57` +
-- 10 dígitos, sin parámetros: el documento definitivo pide que la diapositiva
-- «Clase de prueba gratis» lleve el botón «Escribir por WhatsApp».
--
-- Cualquier otro destino externo sigue rechazado. El CHECK no puede leer la
-- variable de entorno del número; que el número sea el de la corporación es
-- cosa de quien escribe la diapositiva.

alter table public.carrusel_slide
  drop constraint carrusel_slide_destino_formato;

alter table public.carrusel_slide
  add constraint carrusel_slide_destino_formato check (
    destino_enlace is null
    or destino_enlace ~ '^(/[a-z0-9/_-]*|#[a-z0-9-]+)$'
    or destino_enlace ~ '^https://wa\.me/57[0-9]{10}$'
  );

comment on constraint carrusel_slide_destino_formato on public.carrusel_slide is
  'Ruta interna (/semilleros), ancla (#seccion) o un enlace de WhatsApp de Colombia (https://wa.me/57 + 10 dígitos). Ninguna otra URL externa.';
