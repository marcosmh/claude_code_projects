export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

export type PresenceStatus = 'CONNECTED' | 'DISCONNECTED'

// Evento de conexión/desconexión de un usuario, con la hora en que lo recibió el cliente.
export interface PresenceEvent {
  username: string
  status: PresenceStatus
  at: string
}

// Aviso mostrado en la lista de mensajes ("Beto se unió").
export interface PresenceNotice extends PresenceEvent {
  id: string
}
