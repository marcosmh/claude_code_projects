/**
 * Marcas locales y NO sensibles de la sesión. Los tokens ya no pasan por el JavaScript: el access token y el refresh
 * viajan en cookies httpOnly que solo el navegador y el servidor ven (decisión 6 de backend/docs/jwt-migration.md).
 *
 * Si el almacenamiento no está disponible (modo privado, política del navegador, cuota), las marcas se guardan en
 * memoria: valen mientras la pestaña siga abierta.
 */

/**
 * Marca local de "cierre de sesión no confirmado por el servidor": si el logout falla (red, 5xx, 429) las cookies
 * siguen vivas. Mientras la marca exista no se restaura la sesión automáticamente con la cookie del refresh;
 * un inicio de sesión correcto (o un logout confirmado) la borra.
 */
const LOGGED_OUT_KEY = "loggedOut";

let memoryLoggedOut = false;

export function isLoggedOutLocally(): boolean {
  try {
    return window.localStorage.getItem(LOGGED_OUT_KEY) === "1" || memoryLoggedOut;
  } catch {
    return memoryLoggedOut;
  }
}

export function markLoggedOutLocally(): void {
  memoryLoggedOut = true;
  try {
    window.localStorage.setItem(LOGGED_OUT_KEY, "1");
  } catch {
    // Almacenamiento no disponible: queda el respaldo en memoria (vale hasta recargar).
  }
}

export function clearLoggedOutLocally(): void {
  memoryLoggedOut = false;
  try {
    window.localStorage.removeItem(LOGGED_OUT_KEY);
  } catch {
    // Nada que borrar si el almacenamiento no está disponible.
  }
}

/**
 * Instante (ms) de la última renovación de la sesión en cualquier pestaña. Sustituye a la comparación del access
 * token guardado: una pestaña cuya petición dio 401 sabe que otra ya renovó si este instante es posterior al envío.
 */
const REFRESHED_AT_KEY = "refreshedAt";

let memoryRefreshedAt = 0;

export function lastRefreshAt(): number {
  try {
    return Math.max(Number(window.localStorage.getItem(REFRESHED_AT_KEY)) || 0, memoryRefreshedAt);
  } catch {
    return memoryRefreshedAt;
  }
}

export function markRefreshedNow(): void {
  memoryRefreshedAt = Date.now();
  try {
    window.localStorage.setItem(REFRESHED_AT_KEY, String(memoryRefreshedAt));
  } catch {
    // Sin almacenamiento solo se coordina esta pestaña; el servidor tolera una reutilización inmediata del refresh.
  }
}

/** Borra el access token que versiones anteriores guardaban en `localStorage`: ya no se usa y no debe quedar legible. */
export function purgeLegacyAccessToken(): void {
  try {
    window.localStorage.removeItem("accessToken");
  } catch {
    // Nada que borrar si el almacenamiento no está disponible.
  }
}
