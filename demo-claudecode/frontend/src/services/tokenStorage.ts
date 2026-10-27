/**
 * Único punto de acceso al access token (JWT de vida corta).
 *
 * Decisión del proyecto: se guarda en `localStorage` y se envía como `Authorization: Bearer`. Cualquier script de la
 * página puede leerlo, por eso la CSP estricta es obligatoria (ver README). El refresh token NO pasa por aquí:
 * vive en una cookie httpOnly que el JavaScript no puede leer.
 *
 * Si el almacenamiento no está disponible (modo privado, política del navegador, cuota), se usa la memoria como
 * respaldo: la sesión funciona mientras la pestaña siga abierta y se recupera con el refresh al recargar.
 */
const STORAGE_KEY = "accessToken";

let memoryToken: string | null = null;

export function getAccessToken(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? memoryToken;
  } catch {
    return memoryToken;
  }
}

export function setAccessToken(token: string): void {
  memoryToken = token;
  try {
    window.localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Almacenamiento no disponible: queda el respaldo en memoria.
  }
}

export function clearAccessToken(): void {
  memoryToken = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nada que borrar si el almacenamiento no está disponible.
  }
}

/**
 * Marca local de "cierre de sesión no confirmado por el servidor": si el logout falla (red, 5xx, 429) la cookie
 * httpOnly del refresh sigue viva. Mientras la marca exista no se restaura la sesión automáticamente con esa cookie;
 * un inicio de sesión correcto (o un logout confirmado) la borra. Mismo respaldo en memoria que el token.
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
