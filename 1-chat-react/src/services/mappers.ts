import type { PresenceEvent } from '../types/chat'
import type { Message } from '../types/message'
import type { ChatMessageDto, UserSessionDto } from './dto'

export function toMessage(dto: ChatMessageDto): Message {
  return { id: dto.id, sender: dto.username, sentAt: dto.timestamp, text: dto.content }
}

// La hora del evento es la de recepción: connectionTime del backend es la de conexión, no la de salida.
export function toPresenceEvent(dto: UserSessionDto, now: Date = new Date()): PresenceEvent {
  return { username: dto.username, status: dto.status, at: now.toISOString() }
}
