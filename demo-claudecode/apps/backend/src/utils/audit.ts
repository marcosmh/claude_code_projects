import type { AuditRepository } from "../repositories/AuditRepository";

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

/** Runs every logger; one that throws never stops the others nor breaks the request that produced the event. */
export function combineAudit(...loggers: AuditLogger[]): AuditLogger {
  return (action, fields) => {
    for (const logger of loggers) {
      try {
        logger(action, fields);
      } catch {
        console.error(JSON.stringify({ level: "error", event: "audit_logger_failed", action }));
      }
    }
  };
}

/** Too frequent and too uninteresting to keep (one per access-token renewal); the other events are the trail. */
const NOT_PERSISTED: ReadonlySet<AuditAction> = new Set(["refresh_success"]);

/**
 * Stores the security trail in the database. Fire-and-forget: the login or refresh that raised the event never waits
 * for, nor fails because of, the write; a failed write is reported on stderr (without anything but the action).
 */
export function persistentAudit(repository: AuditRepository): AuditLogger {
  return (action, fields = {}) => {
    if (NOT_PERSISTED.has(action)) return;
    repository.record({ action, userId: fields.userId, reason: fields.reason }).catch(() => {
      console.error(JSON.stringify({ level: "error", event: "audit_persist_failed", action }));
    });
  };
}
