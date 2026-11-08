export const MAXIMUM_SEARCH_TERMS = 5;

/** Escapa los comodines de LIKE/ILIKE para que el texto del usuario se busque literal. */
export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/**
 * Divide el texto de búsqueda en términos únicos (sin distinguir mayúsculas).
 * Cada término debe coincidir con algún campo; los acentos se ignoran en la consulta SQL.
 */
export function splitSearchTerms(searchText: string): string[] {
  const uniqueTerms = new Map<string, string>();
  for (const term of searchText.trim().split(/\s+/)) {
    if (term === "") continue;
    const key = term.toLowerCase();
    if (!uniqueTerms.has(key)) uniqueTerms.set(key, term);
  }
  return [...uniqueTerms.values()].slice(0, MAXIMUM_SEARCH_TERMS);
}
