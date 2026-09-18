/**
 * Clases de error del dominio.
 *
 * La regla: el código de negocio lanza estas clases, nunca `Error` pelado, y
 * la capa HTTP las traduce a respuestas. Así un mismo error se ve igual en un
 * route handler, en una Server Action y en un job de cron.
 */

export type CodigoError =
  | "validacion"
  | "no_encontrado"
  | "no_autorizado"
  | "prohibido"
  | "conflicto"
  | "limite_excedido"
  | "servicio_externo"
  | "interno";

export class ErrorApp extends Error {
  readonly codigo: CodigoError;
  readonly estado: number;
  /** Detalle por campo, útil para formularios. */
  readonly detalles?: Record<string, string[]>;

  constructor(
    mensaje: string,
    codigo: CodigoError,
    estado: number,
    detalles?: Record<string, string[]>,
  ) {
    super(mensaje);
    this.name = new.target.name;
    this.codigo = codigo;
    this.estado = estado;
    this.detalles = detalles;
  }
}

export class ErrorValidacion extends ErrorApp {
  constructor(mensaje = "Los datos enviados no son válidos.", detalles?: Record<string, string[]>) {
    super(mensaje, "validacion", 422, detalles);
  }
}

export class ErrorNoEncontrado extends ErrorApp {
  constructor(mensaje = "No encontramos lo que buscas.") {
    super(mensaje, "no_encontrado", 404);
  }
}

export class ErrorNoAutorizado extends ErrorApp {
  constructor(mensaje = "Debes iniciar sesión para continuar.") {
    super(mensaje, "no_autorizado", 401);
  }
}

export class ErrorProhibido extends ErrorApp {
  constructor(mensaje = "No tienes permiso para hacer esto.") {
    super(mensaje, "prohibido", 403);
  }
}

export class ErrorConflicto extends ErrorApp {
  constructor(mensaje = "La operación choca con el estado actual del recurso.") {
    super(mensaje, "conflicto", 409);
  }
}

export class ErrorServicioExterno extends ErrorApp {
  /** Servicio que falló: 'wompi', 'resend', 'supabase'. */
  readonly servicio: string;

  constructor(servicio: string, mensaje = "Un servicio externo no respondió como esperábamos.") {
    super(mensaje, "servicio_externo", 502);
    this.servicio = servicio;
  }
}
