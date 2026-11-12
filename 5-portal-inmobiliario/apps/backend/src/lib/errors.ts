export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

/** El recurso ya existe (409), por ejemplo un email registrado. */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

/** Falta autenticación o las credenciales no son válidas (401). */
export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** La persona está autenticada pero no tiene permiso (403). */
export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** La solicitud es inválida por un motivo concreto (400). */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/** El archivo supera el tamaño permitido (413). */
export class PayloadTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayloadTooLargeError";
  }
}

/** El tipo de archivo no está permitido (415). */
export class UnsupportedMediaTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedMediaTypeError";
  }
}

/** Un servicio externo falló o respondió algo inválido (502). */
export class BadGatewayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadGatewayError";
  }
}

/** Una integración necesaria no está configurada o disponible (503). */
export class ServiceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceUnavailableError";
  }
}

/** Se superó un límite de intentos o de peticiones (429). */
export class TooManyRequestsError extends Error {
  constructor(
    message: string,
    readonly retryAfterSeconds: number,
  ) {
    super(message);
    this.name = "TooManyRequestsError";
  }
}
