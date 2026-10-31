// Contratos del backend (docs/websocket-api.md del proyecto Spring Boot).
export interface ChatMessageDto {
  id: number
  username: string
  content: string
  timestamp: string
}

export interface UserSessionDto {
  username: string
  connectionTime: string
  status: 'CONNECTED' | 'DISCONNECTED'
}

export type MessageType = 'CHAT' | 'USER_CONNECTED' | 'USER_DISCONNECTED' | 'USER_TYPING' | 'USER_STOPPED_TYPING'

// Aviso del sistema publicado en /topic/system (no es un mensaje de chat y no está en el historial).
export interface SystemEventDto {
  type: MessageType
  username: string
  content: string
  timestamp: string
}

// Estado de escritura efímero publicado en /topic/typing (no se guarda).
export interface TypingEventDto {
  type: MessageType
  username: string
  timestamp: string
}

export interface ErrorDto {
  message: string
}
