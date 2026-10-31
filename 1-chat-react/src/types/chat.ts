export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

export type PresenceStatus = 'CONNECTED' | 'DISCONNECTED'

// Evento de conexión/desconexión de un usuario, con la hora en que lo recibió el cliente.
export interface PresenceEvent {
  username: string
  status: PresenceStatus
  at: string
}

export type SystemEventType = 'USER_CONNECTED' | 'USER_DISCONNECTED'

// Mensaje del sistema mostrado en la lista, distinto de los mensajes de usuarios ("Luke se ha conectado al chat.").
export interface SystemNotice {
  id: string
  type: SystemEventType
  username: string
  text: string
  at: string
}

// Alguien empezó (typing: true) o dejó de escribir.
export interface TypingEvent {
  username: string
  typing: boolean
}
