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
