/** Entero positivo o `null` si el parámetro de ruta no lo es. */
export function parseId(raw: string | undefined): number | null {
  const n = Number(raw);
  return raw !== undefined && Number.isInteger(n) && n > 0 ? n : null;
}
