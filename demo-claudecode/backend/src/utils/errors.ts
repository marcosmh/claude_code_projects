export interface ErrorDetail {
  field?: string;
  message: string;
}

export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;

  constructor(
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Malformed request: bad JSON, bad id, bad query, schema violations (400). */
export class BadRequestError extends AppError {
  readonly status = 400;
  readonly code = "VALIDATION_ERROR";
}

export class NotFoundError extends AppError {
  readonly status = 404;
  readonly code = "NOT_FOUND";
}

export class ConflictError extends AppError {
  readonly status = 409;
  readonly code = "CONFLICT";
}

/** Well-formed request that violates a business rule (422). */
export class ValidationError extends AppError {
  readonly status = 422;
  readonly code = "UNPROCESSABLE_ENTITY";
}
