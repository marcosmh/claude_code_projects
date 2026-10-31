import { describe, expect, it } from 'vitest'
import { toMessage, toPresenceEvent, toSystemNotice, toTypingEvent } from './mappers'

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

  it('convierte un evento del sistema en aviso y descarta otros tipos', () => {
    const base = { username: 'Luke', content: 'Luke se ha conectado al chat.', timestamp: '2026-10-30T10:00:00Z' }

    expect(toSystemNotice({ ...base, type: 'USER_CONNECTED' })).toEqual({
      id: 'USER_CONNECTED-Luke-2026-10-30T10:00:00Z',
      type: 'USER_CONNECTED',
      username: 'Luke',
      text: 'Luke se ha conectado al chat.',
      at: '2026-10-30T10:00:00Z',
    })
    expect(toSystemNotice({ ...base, type: 'CHAT' })).toBeNull()
  })

  it('convierte los eventos de escritura y descarta otros tipos', () => {
    const base = { username: 'Anakin', timestamp: '2026-10-30T10:00:00Z' }

    expect(toTypingEvent({ ...base, type: 'USER_TYPING' })).toEqual({ username: 'Anakin', typing: true })
    expect(toTypingEvent({ ...base, type: 'USER_STOPPED_TYPING' })).toEqual({ username: 'Anakin', typing: false })
    expect(toTypingEvent({ ...base, type: 'CHAT' })).toBeNull()
  })
})
