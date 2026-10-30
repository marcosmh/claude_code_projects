import { useMemo } from 'react'
import { getMockMessages } from '../data/mockMessages'
import type { Message } from '../types/message'

// Fuente de mensajes del chat. Hoy son datos simulados; aquí se sustituirán por el
// historial REST y los mensajes entrantes de WebSocket/SSE sin tocar la capa visual.
export function useMessages(currentUser: string | null): Message[] {
  // Referencia estable: solo cambia al conectar/desconectar.
  return useMemo(() => (currentUser ? getMockMessages(currentUser) : []), [currentUser])
}
