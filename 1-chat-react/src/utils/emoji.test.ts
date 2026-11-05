import { describe, expect, it } from 'vitest'
import { isEmojiOnly } from './emoji'

describe('isEmojiOnly', () => {
  it('detecta mensajes formados solo por emojis', () => {
    expect(isEmojiOnly('🔥🚀🎉')).toBe(true)
    expect(isEmojiOnly(' 👋 ')).toBe(true)
    expect(isEmojiOnly('👨‍👩‍👧‍👦 👍🏽 🇲🇽 ✍️')).toBe(true)
  })

  it('no destaca texto, texto con emojis, números ni vacío', () => {
    expect(isEmojiOnly('Hola a todos 👋😀')).toBe(false)
    expect(isEmojiOnly('hola')).toBe(false)
    expect(isEmojiOnly('123')).toBe(false)
    expect(isEmojiOnly('   ')).toBe(false)
  })

  it('no destaca párrafos largos de emojis', () => {
    expect(isEmojiOnly('😀'.repeat(25))).toBe(false)
  })
})
