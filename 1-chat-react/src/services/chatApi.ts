import { env } from '../config/env'
import type { Message } from '../types/message'
import type { ChatMessageDto, UserSessionDto } from './dto'
import { toMessage } from './mappers'

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${env.apiUrl}${path}`, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`GET ${path} falló con estado ${response.status}`)
  return (await response.json()) as T
}

export async function fetchHistory(limit = 50): Promise<Message[]> {
  const dtos = await getJson<ChatMessageDto[]>(`/api/messages?limit=${limit}`)
  return dtos.map(toMessage)
}

export async function fetchConnectedUsers(): Promise<string[]> {
  const sessions = await getJson<UserSessionDto[]>('/api/users/connected')
  return sessions.map((session) => session.username)
}
