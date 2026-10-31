import { describe, expect, it } from 'vitest'
import { toMessage, toPresenceEvent } from './mappers'

describe('mappers', () => {
  it('convierte el DTO del backend al modelo Message del frontend', () => {
    expect(toMessage({ id: 7, username: 'Ana', content: 'hola', timestamp: '2026-10-30T10:00:00Z' })).toEqual({
      id: 7,
      sender: 'Ana',
      text: 'hola',
      sentAt: '2026-10-30T10:00:00Z',
    })
  })

  it('el evento de presencia usa la hora de recepción, no la de conexión', () => {
    const event = toPresenceEvent(
      { username: 'Ana', connectionTime: '2026-10-30T09:00:00Z', status: 'DISCONNECTED' },
      new Date('2026-10-30T11:00:00Z'),
    )

    expect(event).toEqual({ username: 'Ana', status: 'DISCONNECTED', at: '2026-10-30T11:00:00.000Z' })
  })
})
