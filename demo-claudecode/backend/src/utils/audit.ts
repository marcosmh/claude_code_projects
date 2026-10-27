export type AuditAction =
  | "login_success"
  | "login_failed"
  | "login_locked"
  | "refresh_success"
  | "refresh_failed"
  | "refresh_reuse_detected"
  | "refresh_reuse_grace"
  | "logout"
  | "password_changed"
  | "password_change_failed"
  | "password_rehashed"
  | "password_rehash_failed";

/** Deliberately narrow: there is no field that could carry a password, a token or an email. */
export interface AuditFields {
  userId?: number;
  reason?: string;
}

export type AuditLogger = (action: AuditAction, fields?: AuditFields) => void;

/** One JSON line per security event on stdout. Silent under tests. */
export const consoleAudit: AuditLogger = (action, fields = {}) => {
  if (process.env.NODE_ENV === "test") return;
  console.info(JSON.stringify({ level: "info", event: "audit", action, ...fields, at: new Date().toISOString() }));
};
