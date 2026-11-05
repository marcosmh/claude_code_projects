import { describe, expect, it } from 'vitest'
import { insertAtCursor } from './insertAtCursor'

describe('insertAtCursor', () => {
  it('inserta en la posición del cursor y deja el cursor después del emoji', () => {
    expect(insertAtCursor('Hola mundo', '👋', 4, 4)).toEqual({ value: 'Hola👋 mundo', caret: 6 })
  })

  it('sustituye la selección', () => {
    expect(insertAtCursor('Hola mundo', '🌍', 5, 10)).toEqual({ value: 'Hola 🌍', caret: 7 })
    expect(insertAtCursor('Hola mundo', '🌍', 10, 5).value).toBe('Hola 🌍')
  })

  it('funciona al inicio, al final, en vacío y con posiciones fuera de rango', () => {
    expect(insertAtCursor('', '🔥', 0, 0)).toEqual({ value: '🔥', caret: 2 })
    expect(insertAtCursor('a', '🔥', 0, 0).value).toBe('🔥a')
    expect(insertAtCursor('a', '🔥', 99, 99)).toEqual({ value: 'a🔥', caret: 3 })
    expect(insertAtCursor('a', '🔥', -5, -5).value).toBe('🔥a')
  })
})
