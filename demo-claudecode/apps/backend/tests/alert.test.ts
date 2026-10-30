import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_LOCKOUT_THRESHOLD,
  createAlerter,
  createDefaultSink,
  lockoutThresholdFromEnv,
  webhookUrlFromEnv,
  type Alert,
} from "../src/utils/alert";

afterEach(() => vi.restoreAllMocks());

/** The alerter hands alerts to the sink on a microtask: wait for it. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function harness(options: Parameters<typeof createAlerter>[1] = {}) {
  let t = Date.UTC(2026, 9, 29, 12);
  const alerts: Alert[] = [];
  const alerter = createAlerter((alert) => void alerts.push(alert), { now: () => t, ...options });
  return { alerter, alerts, advance: (ms: number) => (t += ms) };
}

describe("createAlerter", () => {
  it("avisa de inmediato cuando se reutiliza un refresh token", async () => {
    const h = harness();
    h.alerter("refresh_reuse_detected", { userId: 7, reason: "concurrent_rotation" });
    await flush();
    expect(h.alerts).toEqual([
      { kind: "refresh_reuse_detected", message: expect.stringContaining("refresh token"), userId: 7, at: "2026-10-29T12:00:00.000Z" },
    ]);
  });

  it("ignora los demás eventos, incluida la gracia de refresh", async () => {
    const h = harness({ lockoutThreshold: 1 });
    for (const action of ["login_success", "login_failed", "refresh_reuse_grace", "logout", "password_changed"] as const) h.alerter(action);
    await flush();
    expect(h.alerts).toEqual([]);
  });

  it("avisa una sola vez al llegar al umbral de cuentas bloqueadas dentro de la ventana", async () => {
    const h = harness({ lockoutThreshold: 3, windowMs: 60_000 });
    h.alerter("login_locked", { userId: 1 });
    h.alerter("login_locked", { userId: 2 });
    await flush();
    expect(h.alerts).toEqual([]);
    h.alerter("login_locked", { userId: 3 });
    h.alerter("login_locked", { userId: 4 });
    await flush();
    expect(h.alerts).toEqual([expect.objectContaining({ kind: "login_lockout_spike", count: 3, windowSeconds: 60 })]);
  });

  it("los bloqueos fuera de la ventana no cuentan, y un ataque sostenido avisa de nuevo en la ventana siguiente", async () => {
    const h = harness({ lockoutThreshold: 2, windowMs: 60_000 });
    h.alerter("login_locked");
    h.advance(61_000);
    h.alerter("login_locked");
    await flush();
    expect(h.alerts).toEqual([]);
    h.alerter("login_locked"); // 2 in window -> alert
    await flush();
    expect(h.alerts).toHaveLength(1);
    h.advance(30_000);
    h.alerter("login_locked");
    await flush();
    expect(h.alerts).toHaveLength(1); // same window: no flood
    h.advance(61_000);
    h.alerter("login_locked");
    h.alerter("login_locked");
    await flush();
    expect(h.alerts).toHaveLength(2);
  });

  it("un sink que falla no lanza ni rompe a quien registra el evento", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const alerter = createAlerter(() => {
      throw new Error("secret-url-should-not-leak");
    });
    expect(() => alerter("refresh_reuse_detected", { userId: 1 })).not.toThrow();
    await flush();
    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0][0])).toContain("alert_sink_failed");
    expect(String(error.mock.calls[0][0])).not.toContain("secret-url");
  });
});

describe("configuración por entorno", () => {
  it("lockoutThresholdFromEnv: entero 1..10000, si no el valor por defecto", () => {
    expect(lockoutThresholdFromEnv("5")).toBe(5);
    for (const bad of [undefined, "", "0", "abc", "-3", "1.5", "10001", "99999"]) {
      expect(lockoutThresholdFromEnv(bad)).toBe(DEFAULT_LOCKOUT_THRESHOLD);
    }
  });

  it("webhookUrlFromEnv: https siempre; http solo hacia localhost fuera de producción; lo demás se ignora", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(webhookUrlFromEnv({})).toBeUndefined();
    expect(webhookUrlFromEnv({ AUDIT_ALERT_WEBHOOK_URL: "https://hooks.example.com/x" })?.href).toBe("https://hooks.example.com/x");
    expect(webhookUrlFromEnv({ AUDIT_ALERT_WEBHOOK_URL: "http://localhost:9000/x" })?.hostname).toBe("localhost");
    expect(webhookUrlFromEnv({ AUDIT_ALERT_WEBHOOK_URL: "http://localhost:9000/x", NODE_ENV: "production" })).toBeUndefined();
    expect(webhookUrlFromEnv({ AUDIT_ALERT_WEBHOOK_URL: "http://hooks.example.com/x" })).toBeUndefined();
    expect(webhookUrlFromEnv({ AUDIT_ALERT_WEBHOOK_URL: "no es una url" })).toBeUndefined();
  });
});

describe("createDefaultSink", () => {
  const alert: Alert = { kind: "refresh_reuse_detected", message: "m", userId: 1, at: "2026-10-29T12:00:00.000Z" };

  it("sin webhook no hace ninguna petición", async () => {
    const fetchImpl = vi.fn();
    await createDefaultSink(undefined, fetchImpl as unknown as typeof fetch)(alert);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("con webhook hace POST JSON con { text, alert }", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 200 }));
    await createDefaultSink(new URL("https://hooks.example.com/x"), fetchImpl as unknown as typeof fetch)(alert);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.href).toBe("https://hooks.example.com/x");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ text: "[facturas] m", alert });
  });

  it("una respuesta no 2xx hace fallar el sink (lo registra el alerter, sin mostrar la URL)", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 500 }));
    await expect(createDefaultSink(new URL("https://hooks.example.com/x"), fetchImpl as unknown as typeof fetch)(alert)).rejects.toThrow("webhook 500");
  });
});
