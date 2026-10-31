import type { ConnectionState, PresenceEvent, SystemNotice, TypingEvent } from '../types/chat'
import type { Message } from '../types/message'

const MAX_NOTICES = 50

export interface ChatState {
  status: ConnectionState
  // Nombre elegido; null cuando no hay conexión en curso.
  username: string | null
  messages: Message[]
  onlineUsers: string[]
  notices: SystemNotice[]
  // Usuarios (distintos del propio) que están escribiendo ahora, en orden de aparición.
  typingUsers: string[]
  error: string | null
}

export const initialChatState: ChatState = {
  status: 'disconnected',
  username: null,
  messages: [],
  onlineUsers: [],
  notices: [],
  typingUsers: [],
  error: null,
}

export type ChatAction =
  | { type: 'connect'; username: string }
  | { type: 'joined' }
  | { type: 'reconnecting' }
  | { type: 'joinFailed'; message: string }
  | { type: 'disconnect' }
  | { type: 'history'; messages: Message[] }
  | { type: 'message'; message: Message }
  | { type: 'users'; users: string[] }
  | { type: 'presence'; event: PresenceEvent }
  | { type: 'system'; notice: SystemNotice }
  | { type: 'typing'; event: TypingEvent }
  | { type: 'error'; message: string }
  | { type: 'clearError' }

// Une listas de mensajes sin duplicados (el historial REST y el tiempo real pueden solaparse), en orden cronológico.
export function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const byId = new Map<number, Message>()
  for (const message of [...current, ...incoming]) byId.set(message.id, message)
  return [...byId.values()].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime() || a.id - b.id,
  )
}

function withoutUser(users: string[], username: string): string[] {
  return users.includes(username) ? users.filter((name) => name !== username) : users
}

function withUser(users: string[], username: string): string[] {
  return users.includes(username) ? users : [...users, username]
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'connect':
      return { ...initialChatState, status: 'connecting', username: action.username }
    case 'joined':
      return {
        ...state,
        status: 'connected',
        error: null,
        onlineUsers: state.username ? withUser(state.onlineUsers, state.username) : state.onlineUsers,
      }
    // Al perder la conexión se pierden los eventos de "dejó de escribir": mejor vaciar el indicador.
    case 'reconnecting':
      return state.status === 'disconnected' ? state : { ...state, status: 'reconnecting', typingUsers: [] }
    case 'joinFailed':
      return { ...initialChatState, error: action.message }
    case 'disconnect':
      return initialChatState
    case 'history':
      return { ...state, messages: mergeMessages(state.messages, action.messages) }
    case 'message':
      // Quien envía un mensaje ya no está escribiendo.
      return {
        ...state,
        messages: mergeMessages(state.messages, [action.message]),
        typingUsers: withoutUser(state.typingUsers, action.message.sender),
      }
    // La lista del servidor sustituye a la local (al reconectar, la anterior puede estar desactualizada).
    case 'users':
      return { ...state, onlineUsers: state.username ? withUser(action.users, state.username) : action.users }
    case 'presence': {
      const { event } = action
      const onlineUsers =
        event.status === 'CONNECTED'
          ? withUser(state.onlineUsers, event.username)
          : state.onlineUsers.filter((name) => name !== event.username)
      return { ...state, onlineUsers, typingUsers: event.status === 'CONNECTED' ? state.typingUsers : withoutUser(state.typingUsers, event.username) }
    }
    case 'typing': {
      const { username, typing } = action.event
      if (username === state.username) return state
      const typingUsers = typing ? withUser(state.typingUsers, username) : withoutUser(state.typingUsers, username)
      return typingUsers === state.typingUsers ? state : { ...state, typingUsers }
    }
    case 'system':
      if (state.notices.some((notice) => notice.id === action.notice.id)) return state
      return { ...state, notices: [...state.notices, action.notice].slice(-MAX_NOTICES) }
    case 'error':
      return { ...state, error: action.message }
    case 'clearError':
      return state.error === null ? state : { ...state, error: null }
  }
}
