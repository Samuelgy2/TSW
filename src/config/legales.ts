/**
 * TEXTO DE LAS TRES PÁGINAS LEGALES.
 *
 * Viene del documento de la cliente (secciones 7.1, 7.2 y 7.3), **adaptado a lo
 * que el sitio hace hoy**. Sus borradores describen cuentas de deportistas y
 * pago con tarjeta, y ninguna de las dos cosas existe: no hay registro público,
 * la matrícula se radica en persona y los pedidos se acuerdan por WhatsApp sin
 * cobro en línea. Publicar que el sitio recoge datos de cuenta o que procesa
 * pagos sería afirmar algo falso en un documento que responde ante la SIC.
 *
 * Cada párrafo retirado o cambiado está registrado, con su texto original y el
 * motivo, en `docs/legales-cambios-para-cliente.md`, para que la cliente lo
 * apruebe. Nada se quitó en silencio.
 *
 * Lo que dependa del NIT o de la dirección de notificación no aparece hasta que
 * se confirme: se omite la frase entera, no se deja un hueco entre corchetes.
 *
 * Esto es una adaptación técnica, no asesoría jurídica: tiene que revisarlo un
 * abogado antes de publicar.
 */
import type { SeccionLegal } from "@/components/ui/DocumentoLegal";
import { CONTACTO, IDENTIDAD_LEGAL, NIT_PUBLICO, TIENDA_MUESTRA_PRECIOS } from "./sitio";

/** El contenido de un documento legal, con lo que necesita su página. Se llama
 * ContenidoLegal y no DocumentoLegal para no chocar con el primitivo que lo
 * pinta, que sí se llama así. */
export type ContenidoLegal = {
  titulo: string;
  bajada: string;
  /** Para <title> y la descripción de buscadores. */
  descripcion: string;
  secciones: SeccionLegal[];
};

/**
 * Identificación de la corporación, igual en los tres documentos.
 *
 * El NIT se cuela solo si está confirmado; la dirección de notificación, solo si
 * existe. `filter(Boolean).join(", ")` evita la coma huérfana de "TSW, , con
 * domicilio…" cuando falta una pieza.
 */
function identificacion(): string {
  const piezas = [
    "Corporación Deportiva TSW",
    NIT_PUBLICO ? `NIT ${NIT_PUBLICO}` : null,
    "con domicilio en Medellín, Antioquia",
    IDENTIDAD_LEGAL.direccionNotificacion
      ? `Dirección de notificación: ${IDENTIDAD_LEGAL.direccionNotificacion}`
      : null,
  ].filter(Boolean);

  return `${piezas.join(", ")}. Correo: ${CONTACTO.correo}. Teléfono: ${CONTACTO.telefono}.`;
}

/** Cómo se piden las cosas: el mismo canal en los tres documentos. */
const CANAL = `Escriba a ${CONTACTO.correo} o al WhatsApp ${CONTACTO.telefono}`;

// --- 1. Tratamiento de datos personales ------------------------------------------

export const POLITICA_DATOS: ContenidoLegal = {
  titulo: "Política de tratamiento de datos personales",
  bajada:
    "Cómo la Corporación Deportiva TSW recoge, usa y protege los datos personales de deportistas, acudientes y compradores.",
  descripcion:
    "Política de tratamiento de datos personales de la Corporación Deportiva TSW, conforme a la Ley 1581 de 2012.",
  secciones: [
    {
      id: "responsable",
      titulo: "Responsable y marco legal",
      bloques: [
        {
          tipo: "definiciones",
          items: [
            { termino: "Responsable del tratamiento", texto: identificacion() },
            {
              termino: "Marco legal",
              texto:
                "Esta política se rige por la Ley Estatutaria 1581 de 2012, el Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) y las demás normas que las modifiquen o complementen.",
            },
          ],
        },
      ],
    },
    {
      id: "que-recoge-el-sitio",
      titulo: "Qué recoge este sitio web",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "Este sitio web no tiene registro de usuarios, formularios de inscripción ni carrito con datos de facturación: navegar por él y descargar los formatos no requiere entregar ningún dato. Los formatos de matrícula se diligencian y se entregan en la sede, en papel.",
        },
        {
          tipo: "parrafo",
          texto:
            "El único acceso con contraseña es el panel de administración, que usa el personal de la corporación para publicar contenido. De ese acceso se guardan el correo y el nombre del administrador.",
        },
        {
          tipo: "parrafo",
          texto:
            "El sitio no cobra ni pide datos de tarjeta: no hay pasarela de pago conectada. Lo que sí hay es un canal de contacto, y por ahí sí llegan datos personales: ver la sección siguiente.",
        },
      ],
    },
    {
      id: "whatsapp",
      titulo: "Datos que llegan por WhatsApp",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "Los pedidos de la tienda y las consultas se atienden por WhatsApp. El sitio arma el mensaje con los artículos y las tallas, y la persona lo envía desde su propia aplicación; cuando ese mensaje llega al WhatsApp de la corporación, la corporación pasa a tratar los datos que contiene.",
        },
        {
          tipo: "definiciones",
          items: [
            {
              termino: "Qué datos",
              texto:
                "El nombre del perfil de WhatsApp, el número de teléfono desde el que escribe y el contenido del mensaje, con lo que la persona decida incluir: artículos y tallas, dirección o punto de entrega, y el texto de su consulta.",
            },
            {
              termino: "Para qué",
              texto:
                "Únicamente para atender ese pedido o esa consulta: confirmar disponibilidad y precio, acordar el pago y la entrega, y responder lo que se pregunte.",
            },
            {
              termino: "Para qué NO",
              texto:
                "Esos datos no se usan para ninguna otra finalidad sin autorización previa y expresa de la persona. No se envían promociones, no se agrega el número a listas de difusión y no se comparte con terceros, salvo obligación legal.",
            },
            {
              termino: "Cuánto se conservan",
              texto:
                "Mientras sea necesario para atender el pedido o la consulta y para cumplir las obligaciones legales, contables y de garantía que se deriven de la venta.",
            },
            {
              termino: "Cómo ejercer sus derechos",
              texto: `Por el mismo WhatsApp ${CONTACTO.telefono} o escribiendo a ${CONTACTO.correo}, con los plazos y el procedimiento de la sección "Cómo ejercer sus derechos" de esta política. Puede pedir que se supriman la conversación y sus datos cuando no exista un deber legal o contractual de conservarlos.`,
            },
            {
              termino: "WhatsApp es un servicio de un tercero",
              texto:
                "La conversación viaja por la infraestructura de WhatsApp (Meta Platforms), que trata los datos según sus propias políticas. La corporación no controla ese tratamiento y responde por lo que hace con el mensaje una vez recibido.",
            },
          ],
        },
      ],
    },
    {
      id: "datos",
      titulo: "Datos que la corporación recolecta",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "Además de lo anterior, en la relación deportiva y comercial —que ocurre en la sede y no en el sitio web—, la corporación recolecta:",
        },
        {
          tipo: "lista",
          items: [
            "Datos de identificación y contacto de deportistas, acudientes y compradores: nombre, documento, fecha de nacimiento, dirección, teléfono y correo.",
            "Datos de salud necesarios para la práctica deportiva segura: EPS, condiciones médicas relevantes y contacto de emergencia.",
            "Fotografías y videos tomados en entrenamientos y competencias.",
            "Datos del pedido y de la entrega que el comprador facilita al hacer su pedido por WhatsApp o en la sede.",
          ],
        },
      ],
    },
    {
      id: "finalidades",
      titulo: "Finalidades",
      bloques: [
        {
          tipo: "lista",
          items: [
            "Gestionar la inscripción, la matrícula y la vinculación deportiva.",
            "Organizar grupos, horarios y el seguimiento del proceso de formación.",
            "Inscribir a los deportistas en competencias y ante la Liga Antioqueña de Ciclismo, el INDER Medellín y demás entidades deportivas.",
            "Atender emergencias médicas durante entrenamientos y competencias.",
            "Publicar resultados deportivos y contenido institucional en el sitio web y las redes sociales, cuando exista autorización de uso de imagen.",
            "Atender los pedidos de la tienda, sus entregas, cambios y garantías.",
            "Enviar información sobre horarios, eventos y novedades de la corporación.",
            "Cumplir obligaciones legales, contables y tributarias.",
          ],
        },
      ],
    },
    {
      id: "menores-y-sensibles",
      titulo: "Menores de edad y datos sensibles",
      bloques: [
        {
          tipo: "definiciones",
          items: [
            {
              termino: "Datos de niños, niñas y adolescentes",
              texto:
                "El tratamiento de datos de menores de edad respeta su interés superior y sus derechos fundamentales. Se realiza con autorización previa del padre, la madre o el representante legal, y, cuando corresponda, teniendo en cuenta la opinión del menor según su madurez.",
            },
            {
              termino: "Datos sensibles",
              texto:
                "Los datos de salud y las imágenes son datos sensibles. El titular no está obligado a entregarlos ni a autorizar su tratamiento. Los datos de salud se solicitan solo para proteger la integridad del deportista, y las imágenes se publican solo con autorización expresa.",
            },
            {
              termino: "Imágenes en este sitio",
              texto:
                "Ninguna fotografía de una competencia se publica en este sitio si no está registrada la autorización de uso de imagen correspondiente.",
            },
          ],
        },
      ],
    },
    {
      id: "derechos",
      titulo: "Derechos del titular",
      bloques: [
        { tipo: "parrafo", texto: "El titular o su representante puede:" },
        {
          tipo: "lista",
          items: [
            "Conocer, actualizar y rectificar sus datos.",
            "Solicitar prueba de la autorización otorgada.",
            "Ser informado sobre el uso que se da a sus datos.",
            "Revocar la autorización o solicitar la supresión de sus datos, cuando no exista un deber legal o contractual de conservarlos.",
            "Acceder gratuitamente a sus datos.",
            "Presentar quejas ante la Superintendencia de Industria y Comercio.",
          ],
        },
      ],
    },
    {
      id: "como-ejercerlos",
      titulo: "Cómo ejercer sus derechos",
      bloques: [
        {
          tipo: "parrafo",
          texto: `${CANAL}, indicando su nombre, documento, la solicitud y un medio de respuesta.`,
        },
        {
          tipo: "lista",
          items: [
            "Consultas: respuesta en un máximo de 10 días hábiles, prorrogables por 5 días hábiles más, informando el motivo.",
            "Reclamos: respuesta en un máximo de 15 días hábiles, prorrogables por 8 días hábiles más, informando el motivo.",
            "Si el reclamo está incompleto, se pedirá completarlo dentro de los 5 días siguientes; si pasan 2 meses sin respuesta, se entenderá que el reclamo fue desistido.",
          ],
        },
      ],
    },
    {
      id: "seguridad-y-vigencia",
      titulo: "Seguridad y vigencia",
      bloques: [
        {
          tipo: "definiciones",
          items: [
            {
              termino: "Seguridad",
              texto:
                "La corporación adopta medidas técnicas y administrativas razonables para proteger los datos contra pérdida, acceso no autorizado o uso indebido.",
            },
            {
              termino: "Vigencia",
              texto:
                "Esta política rige desde su publicación en este sitio web. Los datos se conservarán mientras exista la relación con el titular y durante el tiempo que exijan las obligaciones legales. Cualquier cambio sustancial se informará en este sitio web.",
            },
          ],
        },
      ],
    },
  ],
};

// --- 2. Términos y condiciones ---------------------------------------------------

export const TERMINOS: ContenidoLegal = {
  titulo: "Términos y condiciones",
  bajada: "Las reglas de uso de este sitio web y de los pedidos que se hacen a partir del catálogo.",
  descripcion:
    "Términos y condiciones de uso del sitio web de la Corporación Deportiva TSW y de los pedidos de la tienda.",
  secciones: [
    {
      id: "identificacion",
      titulo: "Identificación",
      bloques: [
        {
          tipo: "parrafo",
          texto: `Este sitio web pertenece a ${identificacion()} Al usar el sitio, el usuario acepta estos términos.`,
        },
      ],
    },
    {
      id: "uso",
      titulo: "Uso del sitio",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "El usuario se compromete a usar el sitio de forma lícita y a no afectar su funcionamiento. La información sobre clubes, niveles, horarios y matrículas es informativa y puede cambiar sin previo aviso.",
        },
        {
          tipo: "parrafo",
          texto:
            "El sitio no ofrece registro ni cuentas de usuario: no hay que crear una cuenta para consultar información, descargar los formatos de matrícula ni hacer un pedido. El único acceso con contraseña es el panel de administración, reservado al personal de la corporación.",
        },
      ],
    },
    {
      id: "matriculas",
      titulo: "Matrículas",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "La información del sitio no constituye una matrícula. La vinculación se formaliza únicamente con la entrega presencial de los documentos firmados en la sede y la aceptación de la corporación, sujeta a la disponibilidad de cupos.",
        },
      ],
    },
    {
      id: "tienda",
      titulo: "Tienda",
      bloques: [
        {
          tipo: "lista",
          items: [
            "El catálogo es informativo. Elegir un artículo y una talla no cierra una compra: abre una conversación por WhatsApp.",
            ...(TIENDA_MUESTRA_PRECIOS
              ? ["Los precios están en pesos colombianos e incluyen los impuestos aplicables."]
              : []),
            "La corporación confirma por WhatsApp la disponibilidad, el precio, la forma de pago y la entrega antes de que el comprador pague nada.",
            "Este sitio no procesa pagos: no pide datos de tarjeta ni cobra importe alguno.",
            "Los productos se describen con la mayor precisión posible; los colores pueden variar ligeramente según la pantalla.",
            "El pedido está sujeto a disponibilidad de inventario. Si un artículo se agota, la corporación lo informa al confirmar.",
            "Los cambios, retractos y garantías se rigen por la Política de cambios, devoluciones y garantías.",
          ],
        },
      ],
    },
    {
      id: "propiedad",
      titulo: "Propiedad intelectual y responsabilidad",
      bloques: [
        {
          tipo: "definiciones",
          items: [
            {
              termino: "Propiedad intelectual",
              texto:
                "Los nombres, logos, colores, textos, fotografías y demás contenidos de Corporación Deportiva TSW, BMX Club TSW y BMX Mastercross pertenecen a la corporación o se usan con autorización. No pueden reproducirse sin permiso previo.",
            },
            {
              termino: "Responsabilidad",
              texto:
                "La corporación no se hace responsable por interrupciones temporales del sitio ni por el contenido de sitios externos enlazados, como las redes sociales o WhatsApp.",
            },
            {
              termino: "Datos personales",
              texto:
                "El tratamiento de datos se rige por la Política de tratamiento de datos personales publicada en este sitio.",
            },
            {
              termino: "Ley aplicable",
              texto: "Estos términos se rigen por las leyes de la República de Colombia.",
            },
          ],
        },
      ],
    },
  ],
};

// --- 3. Cambios, devoluciones y garantías ----------------------------------------

export const DEVOLUCIONES: ContenidoLegal = {
  titulo: "Política de cambios, devoluciones y garantías",
  bajada: "Qué pasa si un artículo llega con un defecto, no corresponde a lo pedido o quiere devolverlo.",
  descripcion:
    "Garantía, derecho de retracto y reversión del pago en los pedidos de la tienda de la Corporación Deportiva TSW.",
  secciones: [
    {
      id: "garantia",
      titulo: "Garantía por defectos",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "Todos los productos tienen garantía por errores de confección o defectos de fabricación. La corporación no ha fijado un término propio, así que aplica el de la ley: un año desde la entrega. En estos casos, la corporación repara el producto, lo cambia por uno igual o, si no es posible, devuelve el dinero.",
        },
      ],
    },
    {
      id: "retracto",
      titulo: "Derecho de retracto",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "En los pedidos acordados a distancia —por WhatsApp, a partir del catálogo de este sitio—, el comprador puede retractarse dentro de los 5 días hábiles siguientes a la entrega del producto, según el artículo 47 de la Ley 1480 de 2011.",
        },
        {
          tipo: "parrafo",
          texto:
            "El producto debe devolverse en el mismo estado en que se recibió: sin uso, con etiquetas y empaque. Los costos de transporte de la devolución corren por cuenta del comprador. El dinero se devuelve en un plazo máximo de 30 días calendario.",
        },
      ],
    },
    {
      id: "reversion",
      titulo: "Reversión del pago",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "Si el pago se hizo por un medio electrónico —transferencia, billetera digital o tarjeta— y el comprador fue víctima de fraude, no recibió el producto, o el producto no corresponde a lo pedido o es defectuoso, puede solicitar la reversión del pago dentro de los 5 días hábiles siguientes a la fecha en que tuvo conocimiento de la situación, según el artículo 51 de la Ley 1480 de 2011.",
        },
      ],
    },
    {
      id: "tallas",
      titulo: "Cambios de talla",
      bloques: [
        {
          tipo: "parrafo",
          texto: `Recomendamos escribirnos por WhatsApp (${CONTACTO.telefono}) antes de hacer el pedido para elegir la talla correcta.`,
        },
      ],
    },
    {
      id: "solicitud",
      titulo: "Cómo hacer una solicitud",
      bloques: [
        {
          tipo: "parrafo",
          texto: `${CANAL} con su nombre, el artículo, el motivo y fotos si hay un defecto. Le responderemos con las instrucciones.`,
        },
      ],
    },
  ],
};

// --- 4. Cookies y almacenamiento local -------------------------------------------

/**
 * Inventario REAL de lo que el sitio guarda en el navegador (revisado en el
 * código, no copiado de una plantilla). Si se añade una cookie, una herramienta
 * de analítica o publicidad, este documento y la necesidad de pedir aceptación
 * cambian: hoy no se pide porque todo lo que se guarda es necesario para
 * funcionar. Tiene que revisarlo un abogado, igual que los otros tres.
 */
export const POLITICA_COOKIES: ContenidoLegal = {
  titulo: "Política de cookies",
  bajada: "Qué guarda este sitio en su navegador, para qué y cómo puede borrarlo.",
  descripcion:
    "Cookies y almacenamiento local que usa el sitio de la Corporación Deportiva TSW: solo las necesarias para que el carrito y el panel funcionen. Sin publicidad ni analítica con cookies.",
  secciones: [
    {
      id: "que-son",
      titulo: "Qué son las cookies",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "Una cookie es un archivo pequeño que el sitio guarda en su navegador. Sirve para recordar algo entre una página y la siguiente, por ejemplo que usted ya inició sesión. El almacenamiento local es parecido: un espacio del navegador donde el sitio guarda datos que no se envían al servidor.",
        },
        { tipo: "parrafo", texto: identificacion() },
      ],
    },
    {
      id: "visitantes",
      titulo: "Si solo navega por el sitio",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "Navegar por las páginas públicas no guarda ninguna cookie en su navegador. Lo único que se guarda es el contenido de su carrito de compras, en el almacenamiento local de su dispositivo, para que no se pierda si cierra la página.",
        },
        {
          tipo: "definiciones",
          items: [
            {
              termino: "tsw.carrito.v1 (almacenamiento local)",
              texto:
                "Productos, tallas y cantidades que usted agregó al carrito. No se envía al servidor ni contiene datos personales; se queda en su dispositivo hasta que vacíe el carrito o borre los datos del sitio.",
            },
          ],
        },
      ],
    },
    {
      id: "administracion",
      titulo: "Si es administrador del sitio",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "Quienes administran el sitio inician sesión en el panel, y para ello se usan estas cookies. Son necesarias para que la sesión funcione y por eso no requieren su aceptación.",
        },
        {
          tipo: "definiciones",
          items: [
            {
              termino: "sb-…-auth-token",
              texto:
                "Mantiene la sesión iniciada. Es una cookie de sesión: se borra al cerrar el navegador o al cerrar la sesión.",
            },
            {
              termino: "sb-…-code-verifier",
              texto:
                "Acompaña los enlaces de acceso y recuperación de contraseña que llegan por correo. Dura lo que dura ese trámite.",
            },
            {
              termino: "tsw.actividad",
              texto:
                "Registra, firmada, la hora del último movimiento en el panel para cerrar la sesión tras 5 minutos de inactividad. Es una cookie de sesión.",
            },
            {
              termino: "tsw.deporte",
              texto:
                "Recuerda qué deporte tiene seleccionado en el panel. Dura un año y no contiene datos personales.",
            },
          ],
        },
      ],
    },
    {
      id: "terceros",
      titulo: "Terceros, analítica y publicidad",
      bloques: [
        {
          tipo: "lista",
          items: [
            "El sitio no usa cookies de publicidad, de seguimiento ni de redes sociales.",
            "No incrusta contenido de terceros (mapas, videos, botones de redes) que instale cookies propias.",
            "Para medir la velocidad de las páginas se usa Vercel Speed Insights, que registra tiempos de carga de forma agregada y no utiliza cookies.",
            "Los enlaces a WhatsApp e Instagram abren esos servicios, que tienen sus propias políticas.",
          ],
        },
      ],
    },
    {
      id: "gestion",
      titulo: "Cómo borrarlas o bloquearlas",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "Puede ver, borrar o bloquear las cookies desde la configuración de su navegador (Chrome, Safari, Firefox y Edge lo permiten). Si bloquea las del panel, los administradores no podrán iniciar sesión; la navegación pública y el carrito no dependen de ellas. Para borrar el carrito, vacíelo desde la página del carrito o borre los datos del sitio en su navegador.",
        },
      ],
    },
    {
      id: "cambios",
      titulo: "Cambios y contacto",
      bloques: [
        {
          tipo: "parrafo",
          texto: `Si el sitio empieza a usar otras cookies, esta política se actualizará antes de hacerlo. ${CANAL} para cualquier duda sobre esta política.`,
        },
      ],
    },
  ],
};
