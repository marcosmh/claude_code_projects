export type RateLimiterOptions = {
  /** Eventos permitidos dentro de la ventana. */
  maxEvents: number;
  windowMs: number;
  /** Reloj inyectable para las pruebas. */
  now?: () => number;
};

export type RateLimitStatus = { isBlocked: boolean; retryAfterSeconds: number };

/**
 * Limitador de ventana deslizante en memoria. Cada clave guarda las marcas de tiempo de sus
 * eventos recientes; `isBlocked` indica si ya alcanzó el máximo dentro de la ventana.
 */
export function createRateLimiter({ maxEvents, windowMs, now = Date.now }: RateLimiterOptions) {
  const eventsByKey = new Map<string, number[]>();

  const recentEvents = (key: string): number[] => {
    const windowStart = now() - windowMs;
    const recent = (eventsByKey.get(key) ?? []).filter((timestamp) => timestamp > windowStart);
    if (recent.length === 0) eventsByKey.delete(key);
    else eventsByKey.set(key, recent);
    return recent;
  };

  const purgeExpired = () => {
    for (const key of [...eventsByKey.keys()]) recentEvents(key);
  };

  return {
    /** Estado de la clave sin registrar un evento. */
    check(key: string): RateLimitStatus {
      const recent = recentEvents(key);
      if (recent.length < maxEvents) return { isBlocked: false, retryAfterSeconds: 0 };
      const retryAfterMs = recent[0] + windowMs - now();
      return { isBlocked: true, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
    },

    /** Registra un evento (un intento fallido o una petición). */
    record(key: string): void {
      if (eventsByKey.size > 10_000) purgeExpired();
      eventsByKey.set(key, [...recentEvents(key), now()]);
    },

    reset(key: string): void {
      eventsByKey.delete(key);
    },
  };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;
