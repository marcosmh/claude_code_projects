import { useCallback, useEffect, useReducer, useRef } from 'react'
import { fetchConnectedUsers, fetchHistory } from '../services/chatApi'
import { ChatSocket } from '../services/chatSocket'
import { chatReducer, initialChatState } from './chatReducer'

// Si no llega USER_STOPPED_TYPING (p. ej. el otro cliente se cerró), el indicador caduca solo.
const TYPING_EXPIRY_MS = 6000

// Punto de integración con el backend Spring Boot: REST (historial, usuarios) + WebSocket/STOMP (tiempo real).
// Los componentes solo ven estado y callbacks; aquí vive la orquestación.
export function useChat() {
  const [state, dispatch] = useReducer(chatReducer, initialChatState)
  const socketRef = useRef<ChatSocket | null>(null)
  // Identifica la conexión vigente para ignorar respuestas tardías de una conexión anterior.
  const sessionRef = useRef(0)
  const typingTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const clearTypingTimer = useCallback((username: string) => {
    clearTimeout(typingTimersRef.current.get(username))
    typingTimersRef.current.delete(username)
  }, [])

  const teardown = useCallback(() => {
    sessionRef.current += 1
    socketRef.current?.disconnect()
    socketRef.current = null
    typingTimersRef.current.forEach(clearTimeout)
    typingTimersRef.current.clear()
  }, [])

  const connect = useCallback(
    (username: string) => {
      teardown()
      const session = sessionRef.current
      const isCurrent = () => sessionRef.current === session

      const loadSnapshot = () => {
        Promise.all([fetchHistory(), fetchConnectedUsers()])
          .then(([messages, users]) => {
            if (!isCurrent()) return
            dispatch({ type: 'history', messages })
            dispatch({ type: 'users', users })
          })
          .catch(() => {
            if (isCurrent()) dispatch({ type: 'error', message: 'No se pudo cargar el historial.' })
          })
      }

      const failJoin = (message: string) => {
        if (!isCurrent()) return
        teardown()
        dispatch({ type: 'joinFailed', message })
      }

      const socket = new ChatSocket({
        onJoined: () => {
          if (!isCurrent()) return
          dispatch({ type: 'joined' })
          // También al reconectar: rellena lo ocurrido mientras no había conexión.
          loadSnapshot()
        },
        onReconnecting: () => isCurrent() && dispatch({ type: 'reconnecting' }),
        onMessage: (message) => {
          if (!isCurrent()) return
          clearTypingTimer(message.sender)
          dispatch({ type: 'message', message })
        },
        onTyping: (event) => {
          if (!isCurrent()) return
          clearTypingTimer(event.username)
          if (event.typing) {
            typingTimersRef.current.set(
              event.username,
              setTimeout(() => dispatch({ type: 'typing', event: { username: event.username, typing: false } }), TYPING_EXPIRY_MS),
            )
          }
          dispatch({ type: 'typing', event })
        },
        onPresence: (event) => isCurrent() && dispatch({ type: 'presence', event }),
        onSystemEvent: (notice) => isCurrent() && dispatch({ type: 'system', notice }),
        onJoinFailed: failJoin,
        onError: (message) => isCurrent() && dispatch({ type: 'error', message }),
        // Sin confirmación ni error: el REST dice si el servidor sí registró al usuario.
        onJoinUnconfirmed: () => {
          fetchConnectedUsers()
            .then((users) => {
              if (!isCurrent()) return
              if (users.includes(username)) socket.confirmJoined()
              else failJoin('El servidor no respondió. Inténtalo de nuevo.')
            })
            .catch(() => failJoin('No se pudo conectar con el servidor.'))
        },
      })
      socketRef.current = socket
      dispatch({ type: 'connect', username })
      socket.connect(username)
    },
    [teardown, clearTypingTimer],
  )

  const disconnect = useCallback(() => {
    teardown()
    dispatch({ type: 'disconnect' })
  }, [teardown])

  // true si el mensaje salió; el servidor lo difunde de vuelta a todos, incluido el autor.
  const sendMessage = useCallback((text: string): boolean => socketRef.current?.send(text) ?? false, [])

  // Avisar que se escribe es efímero: si no hay sesión simplemente no se envía.
  const setTyping = useCallback((typing: boolean) => {
    socketRef.current?.sendTyping(typing)
  }, [])

  const clearError = useCallback(() => dispatch({ type: 'clearError' }), [])

  useEffect(() => teardown, [teardown])

  return {
    username: state.username,
    status: state.status,
    isConnected: state.status === 'connected',
    messages: state.messages,
    notices: state.notices,
    typingUsers: state.typingUsers,
    onlineUsers: state.onlineUsers,
    error: state.error,
    connect,
    disconnect,
    sendMessage,
    setTyping,
    clearError,
  }
}
