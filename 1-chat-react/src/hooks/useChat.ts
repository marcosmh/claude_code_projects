import { useCallback, useEffect, useReducer, useRef } from 'react'
import { fetchConnectedUsers, fetchHistory } from '../services/chatApi'
import { ChatSocket } from '../services/chatSocket'
import { chatReducer, initialChatState } from './chatReducer'

// Punto de integración con el backend Spring Boot: REST (historial, usuarios) + WebSocket/STOMP (tiempo real).
// Los componentes solo ven estado y callbacks; aquí vive la orquestación.
export function useChat() {
  const [state, dispatch] = useReducer(chatReducer, initialChatState)
  const socketRef = useRef<ChatSocket | null>(null)
  // Identifica la conexión vigente para ignorar respuestas tardías de una conexión anterior.
  const sessionRef = useRef(0)

  const teardown = useCallback(() => {
    sessionRef.current += 1
    socketRef.current?.disconnect()
    socketRef.current = null
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
        onMessage: (message) => isCurrent() && dispatch({ type: 'message', message }),
        onPresence: (event) => isCurrent() && dispatch({ type: 'presence', event }),
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
    [teardown],
  )

  const disconnect = useCallback(() => {
    teardown()
    dispatch({ type: 'disconnect' })
  }, [teardown])

  // true si el mensaje salió; el servidor lo difunde de vuelta a todos, incluido el autor.
  const sendMessage = useCallback((text: string): boolean => socketRef.current?.send(text) ?? false, [])

  const clearError = useCallback(() => dispatch({ type: 'clearError' }), [])

  useEffect(() => teardown, [teardown])

  return {
    username: state.username,
    status: state.status,
    isConnected: state.status === 'connected',
    messages: state.messages,
    notices: state.notices,
    onlineUsers: state.onlineUsers,
    error: state.error,
    connect,
    disconnect,
    sendMessage,
    clearError,
  }
}
