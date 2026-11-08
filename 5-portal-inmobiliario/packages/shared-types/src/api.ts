/** Formato de error de toda la API REST. */
export type ApiErrorBody = {
  message: string;
  status: number;
  details?: unknown;
};
