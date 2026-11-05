export interface Insertion {
  value: string
  // Posición del cursor justo después de lo insertado.
  caret: number
}

// Inserta `insert` sustituyendo la selección [start, end] (o en el cursor si coinciden). No altera nada más del texto.
export function insertAtCursor(value: string, insert: string, start: number, end: number): Insertion {
  const from = Math.min(Math.max(Math.min(start, end), 0), value.length)
  const to = Math.min(Math.max(Math.max(start, end), 0), value.length)
  return { value: value.slice(0, from) + insert + value.slice(to), caret: from + insert.length }
}
