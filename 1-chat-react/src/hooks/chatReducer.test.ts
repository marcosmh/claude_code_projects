import { describe, expect, it } from 'vitest'
import type { Message } from '../types/message'
import { chatReducer, initialChatState, mergeMessages } from './chatReducer'
import type { ChatState } from './chatReducer'

const msg = (id: number, sentAt: string, sender = 'Ana'): Message => ({ id, sender, sentAt, text: `m${id}` })

describe('mergeMessages', () => {
  it('quita duplicados por id y ordena cronológicamente', () => {
    const merged = mergeMessages(
      [msg(2, '2026-10-30T10:02:00Z'), msg(1, '2026-10-30T10:01:00Z')],
      [msg(2, '2026-10-30T10:02:00Z'), msg(3, '2026-10-30T10:03:00Z')],
    )

    expect(merged.map((m) => m.id)).toEqual([1, 2, 3])
  })
})

describe('chatReducer', () => {
  const connected: ChatState = { ...initialChatState, status: 'connected', username: 'Ana', onlineUsers: ['Ana'] }

  it('connect limpia el estado anterior y pasa a connecting', () => {
    const next = chatReducer({ ...connected, messages: [msg(1, '2026-10-30T10:01:00Z')], error: 'x' }, { type: 'connect', username: 'Beto' })

    expect(next).toMatchObject({ status: 'connecting', username: 'Beto', messages: [], error: null })
  })

  it('joinFailed vuelve al estado inicial conservando el error', () => {
    expect(chatReducer({ ...connected, status: 'connecting' }, { type: 'joinFailed', message: 'en uso' })).toEqual({
      ...initialChatState,
      error: 'en uso',
    })
  })

  it('presence solo actualiza la lista de usuarios en línea', () => {
    const join = chatReducer(connected, { type: 'presence', event: { username: 'Beto', status: 'CONNECTED', at: '2026-10-30T10:00:00Z' } })
    expect(join.onlineUsers).toEqual(['Ana', 'Beto'])

    const leave = chatReducer(join, { type: 'presence', event: { username: 'Beto', status: 'DISCONNECTED', at: '2026-10-30T10:02:00Z' } })
    expect(leave.onlineUsers).toEqual(['Ana'])
    expect(leave.notices).toEqual([])
  })

  it('system agrega avisos del sistema sin duplicarlos', () => {
    const notice = {
      id: 'USER_CONNECTED-Beto-2026-10-30T10:00:00Z',
      type: 'USER_CONNECTED' as const,
      username: 'Beto',
      text: 'Beto se ha conectado al chat.',
      at: '2026-10-30T10:00:00Z',
    }
    const once = chatReducer(connected, { type: 'system', notice })
    expect(once.notices).toEqual([notice])
    expect(chatReducer(once, { type: 'system', notice })).toBe(once)
  })

  it('typing soporta varios usuarios, ignora al propio y no duplica', () => {
    const one = chatReducer(connected, { type: 'typing', event: { username: 'Anakin', typing: true } })
    const two = chatReducer(one, { type: 'typing', event: { username: 'Luke', typing: true } })
    expect(two.typingUsers).toEqual(['Anakin', 'Luke'])
    expect(chatReducer(two, { type: 'typing', event: { username: 'Luke', typing: true } })).toBe(two)
    expect(chatReducer(two, { type: 'typing', event: { username: 'Ana', typing: true } })).toBe(two)

    const stopped = chatReducer(two, { type: 'typing', event: { username: 'Anakin', typing: false } })
    expect(stopped.typingUsers).toEqual(['Luke'])
  })

  it('un mensaje, una salida o una reconexión quitan el indicador de escritura', () => {
    const typing: ChatState = { ...connected, typingUsers: ['Beto', 'Luke'] }

    const afterMessage = chatReducer(typing, { type: 'message', message: msg(1, '2026-10-30T10:01:00Z', 'Beto') })
    expect(afterMessage.typingUsers).toEqual(['Luke'])

    const afterLeave = chatReducer(afterMessage, {
      type: 'presence',
      event: { username: 'Luke', status: 'DISCONNECTED', at: '2026-10-30T10:02:00Z' },
    })
    expect(afterLeave.typingUsers).toEqual([])

    expect(chatReducer(typing, { type: 'reconnecting' }).typingUsers).toEqual([])
  })

  it('users reemplaza la lista local por la del servidor, siempre incluyendo al propio usuario', () => {
    const stale: ChatState = { ...connected, onlineUsers: ['Ana', 'Zed'] }

    expect(chatReducer(stale, { type: 'users', users: ['Beto'] }).onlineUsers).toEqual(['Beto', 'Ana'])
  })

  it('reconnecting no resucita una conexión ya cerrada', () => {
    expect(chatReducer(initialChatState, { type: 'reconnecting' })).toBe(initialChatState)
  })

  it('disconnect restablece todo', () => {
    expect(chatReducer(connected, { type: 'disconnect' })).toEqual(initialChatState)
  })
})
