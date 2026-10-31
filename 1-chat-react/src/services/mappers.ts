import type { PresenceEvent, SystemNotice } from '../types/chat'
import type { Message } from '../types/message'
import type { ChatMessageDto, SystemEventDto, UserSessionDto } from './dto'

export function toMessage(dto: ChatMessageDto): Message {
  return { id: dto.id, sender: dto.username, sentAt: dto.timestamp, text: dto.content }
}

// La hora del evento es la de recepción: connectionTime del backend es la de conexión, no la de salida.
export function toPresenceEvent(dto: UserSessionDto, now: Date = new Date()): PresenceEvent {
  return { username: dto.username, status: dto.status, at: now.toISOString() }
}

// null para tipos que no son avisos del sistema (p. ej. un CHAT que llegara por error a este topic).
export function toSystemNotice(dto: SystemEventDto): SystemNotice | null {
  if (dto.type !== 'USER_CONNECTED' && dto.type !== 'USER_DISCONNECTED') return null
  return {
    id: `${dto.type}-${dto.username}-${dto.timestamp}`,
    type: dto.type,
    username: dto.username,
    text: dto.content,
    at: dto.timestamp,
  }
}
