import type { AuditAction, AuditFields, AuditLogger } from "./audit";

export type AlertKind = "refresh_reuse_detected" | "login_lockout_spike";

export interface Alert {
  kind: AlertKind;
  message: string;
  userId?: number;
  /** For spikes: how many events fell in the window. */
  count?: number;
  windowSeconds?: number;
  at: string;
}

export type AlertSink = (alert: Alert) => void | Promise<void>;

export interface AlertOptions {
  /** `login_locked` events inside `windowMs` that raise a spike alert (at most one per window). */
  lockoutThreshold?: number;
  windowMs?: number;
  now?: () => number;
}

export const DEFAULT_LOCKOUT_THRESHOLD = 20;
export const DEFAULT_ALERT_WINDOW_MS = 10 * 60_000;

/**
 * Turns the audit stream into alerts. A reused refresh token (`refresh_reuse_detected`) is a probable theft, so it
 * alerts at once. Many rejected logins on locked accounts (`login_locked`) in a short window suggest someone is
 * guessing passwords or locking accounts on purpose: one alert per window, so a sustained attack is not a flood.
 * It is an `AuditLogger` so it plugs into the same pipeline; the counters are in memory (per process).
 */
export function createAlerter(sink: AlertSink, options: AlertOptions = {}): AuditLogger {
  const { lockoutThreshold = DEFAULT_LOCKOUT_THRESHOLD, windowMs = DEFAULT_ALERT_WINDOW_MS, now = Date.now } = options;
  let lockouts: number[] = [];
  let lastSpikeAt = -Infinity;

  const emit = (alert: Omit<Alert, "at">) => {
    // An alert channel that fails must never break the request that raised it.
    Promise.resolve()
      .then(() => sink({ ...alert, at: new Date(now()).toISOString() }))
      .catch(() => console.error(JSON.stringify({ level: "error", event: "alert_sink_failed", kind: alert.kind })));
  };

  return (action: AuditAction, fields: AuditFields = {}) => {
    if (action === "refresh_reuse_detected") {
      emit({
        kind: "refresh_reuse_detected",
        message: "Se reutilizó un refresh token ya rotado: sesión revocada, posible robo",
        userId: fields.userId,
      });
    } else if (action === "login_locked") {
      const t = now();
      lockouts = lockouts.filter((at) => t - at < windowMs);
      lockouts.push(t);
      if (lockouts.length >= lockoutThreshold && t - lastSpikeAt >= windowMs) {
        lastSpikeAt = t;
        emit({
          kind: "login_lockout_spike",
          message: "Muchos inicios de sesión rechazados por cuenta bloqueada",
          count: lockouts.length,
          windowSeconds: windowMs / 1000,
        });
      }
    }
  };
}

/** `ALERT_LOCKOUT_THRESHOLD`: integer 1..10000; unset or invalid means the default. */
export function lockoutThresholdFromEnv(value: string | undefined = process.env.ALERT_LOCKOUT_THRESHOLD): number {
  const n = /^\d{1,5}$/.test(value?.trim() ?? "") ? Number(value) : NaN;
  return n >= 1 && n <= 10_000 ? n : DEFAULT_LOCKOUT_THRESHOLD;
}

/**
 * `AUDIT_ALERT_WEBHOOK_URL`: where alerts are POSTed as JSON (`{ text, alert }`, which Slack-style webhooks accept).
 * Must be https outside development. Returns undefined when unset or unusable, so alerts then go to stderr only.
 */
export function webhookUrlFromEnv(env: Record<string, string | undefined> = process.env): URL | undefined {
  const raw = env.AUDIT_ALERT_WEBHOOK_URL?.trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol === "https:" || (url.protocol === "http:" && local && env.NODE_ENV !== "production")) return url;
  } catch {
    // fall through
  }
  console.error(JSON.stringify({ level: "error", event: "alert_webhook_ignored", reason: "invalid_or_insecure_url" }));
  return undefined;
}

/** Default sink: always one JSON line on stderr (`level: "alert"`), plus the webhook when configured. */
export function createDefaultSink(webhook: URL | undefined = webhookUrlFromEnv(), fetchImpl: typeof fetch = fetch): AlertSink {
  return async (alert) => {
    if (process.env.NODE_ENV !== "test") console.error(JSON.stringify({ level: "alert", event: "security_alert", ...alert }));
    if (!webhook) return;
    // The URL (it usually carries a secret) is never logged: the caller only reports that the sink failed.
    const response = await fetchImpl(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `[facturas] ${alert.message}`, alert }),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error(`webhook ${response.status}`);
  };
}
