export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiEnvelope<T, M = undefined> {
  data: T;
  meta?: M;
}
