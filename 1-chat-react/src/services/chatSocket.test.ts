import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatSocketHandlers } from './chatSocket'

type FrameCallback = (frame: { body: string }) => void

// Sustituto de @stomp/stompjs: registra suscripciones y publicaciones sin red.
const stomp = vi.hoisted(() => ({
  clients: [] as Array<{
    subscriptions: Map<string, FrameCallback>
    published: Array<{ destination: string; body: string }>
  }>,
}))

vi.mock('@stomp/stompjs', () => ({
  Client: class {
    connected = true
    subscriptions = new Map<string, FrameCallback>()
    published: Array<{ destination: string; body: string }> = []
    onConnect: () => void = () => {}
    onWebSocketClose: () => void = () => {}
    onStompError: () => void = () => {}

    constructor() {
      stomp.clients.push(this)
    }

    activate() {
      queueMicrotask(() => this.onConnect())
    }

    deactivate() {
      return Promise.resolve()
    }

    subscribe(destination: string, callback: FrameCallback) {
      this.subscriptions.set(destination, callback)
    }

    publish(message: { destination: string; body: string }) {
      this.published.push(message)
    }
  },
}))

const { ChatSocket } = await import('./chatSocket')

function handlers(): ChatSocketHandlers {
  return {
    onJoined: vi.fn(),
    onReconnecting: vi.fn(),
    onMessage: vi.fn(),
    onPresence: vi.fn(),
    onSystemEvent: vi.fn(),
    onTyping: vi.fn(),
    onJoinFailed: vi.fn(),
    onError: vi.fn(),
    onJoinUnconfirmed: vi.fn(),
  }
}

const frame = (payload: unknown) => ({ body: JSON.stringify(payload) })

async function joined(username: string, h: ChatSocketHandlers) {
  const socket = new ChatSocket(h, 'ws://test/ws')
  socket.connect(username)
  await Promise.resolve()
  const client = stomp.clients.at(-1)!
  client.subscriptions.get('/topic/presence')!(
    frame({ username, connectionTime: '2026-10-30T10:00:00Z', status: 'CONNECTED' }),
  )
  return { socket, client }
}

describe('ChatSocket', () => {
  beforeEach(() => {
    stomp.clients.length = 0
  })

  it('cada sesión se suscribe a los mismos topics compartidos, incluido /topic/typing', async () => {
    const { client } = await joined('Anakin', handlers())

    expect([...client.subscriptions.keys()].sort()).toEqual([
      '/topic/messages',
      '/topic/presence',
      '/topic/system',
      '/topic/typing',
      '/user/queue/errors',
    ])
  })

  it('envía USER_TYPING y USER_STOPPED_TYPING a /app/chat.typing solo tras unirse', async () => {
    const socket = new ChatSocket(handlers(), 'ws://test/ws')
    socket.connect('Anakin')
    await Promise.resolve()
    expect(socket.sendTyping(true)).toBe(false)

    const { socket: joinedSocket, client } = await joined('Luke', handlers())
    expect(joinedSocket.sendTyping(true)).toBe(true)
    expect(joinedSocket.sendTyping(false)).toBe(true)

    expect(client.published.filter((m) => m.destination === '/app/chat.typing').map((m) => JSON.parse(m.body))).toEqual([
      { type: 'USER_TYPING' },
      { type: 'USER_STOPPED_TYPING' },
    ])
  })

  it('entrega los eventos de escritura de cualquier usuario y descarta tipos ajenos', async () => {
    const h = handlers()
    const { client } = await joined('Obi-Wan', h)
    const typing = client.subscriptions.get('/topic/typing')!

    typing(frame({ type: 'USER_TYPING', username: 'Anakin', timestamp: '2026-10-30T10:00:00Z' }))
    typing(frame({ type: 'USER_TYPING', username: 'Luke', timestamp: '2026-10-30T10:00:01Z' }))
    typing(frame({ type: 'USER_STOPPED_TYPING', username: 'Anakin', timestamp: '2026-10-30T10:00:02Z' }))
    typing(frame({ type: 'CHAT', username: 'Raro', timestamp: '2026-10-30T10:00:03Z' }))

    expect(vi.mocked(h.onTyping).mock.calls.map(([event]) => event)).toEqual([
      { username: 'Anakin', typing: true },
      { username: 'Luke', typing: true },
      { username: 'Anakin', typing: false },
    ])
  })
})
