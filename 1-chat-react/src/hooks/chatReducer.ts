import type { ConnectionState, PresenceEvent, SystemNotice } from '../types/chat'
import type { Message } from '../types/message'

const MAX_NOTICES = 50

export interface ChatState {
  status: ConnectionState
  // Nombre elegido; null cuando no hay conexión en curso.
  username: string | null
  messages: Message[]
  onlineUsers: string[]
  notices: SystemNotice[]
  error: string | null
}

export const initialChatState: ChatState = {
  status: 'disconnected',
  username: null,
  messages: [],
  onlineUsers: [],
  notices: [],
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
    case 'reconnecting':
      return state.status === 'disconnected' ? state : { ...state, status: 'reconnecting' }
    case 'joinFailed':
      return { ...initialChatState, error: action.message }
    case 'disconnect':
      return initialChatState
    case 'history':
      return { ...state, messages: mergeMessages(state.messages, action.messages) }
    case 'message':
      return { ...state, messages: mergeMessages(state.messages, [action.message]) }
    // La lista del servidor sustituye a la local (al reconectar, la anterior puede estar desactualizada).
    case 'users':
      return { ...state, onlineUsers: state.username ? withUser(action.users, state.username) : action.users }
    case 'presence': {
      const { event } = action
      const onlineUsers =
        event.status === 'CONNECTED'
          ? withUser(state.onlineUsers, event.username)
          : state.onlineUsers.filter((name) => name !== event.username)
      return { ...state, onlineUsers }
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
