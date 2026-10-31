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

export interface ErrorDto {
  message: string
}
