import { useEffect, useRef } from 'react'
import type { Message } from '../../types/message'
import MessageItem from './MessageItem'

interface MessageListProps {
  messages: Message[]
  currentUser: string
}

// Mensajes seguidos del mismo autor dentro de esta ventana se agrupan bajo un solo encabezado.
const GROUP_WINDOW_MS = 5 * 60 * 1000

function startsGroup(previous: Message | undefined, current: Message): boolean {
  if (!previous || previous.sender !== current.sender) return true
  return new Date(current.sentAt).getTime() - new Date(previous.sentAt).getTime() > GROUP_WINDOW_MS
}

export default function MessageList({ messages, currentUser }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null)

  // Solo al cambiar la cantidad de mensajes, no en cada render del padre.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  return (
    <div
      role="log"
      aria-label="Mensajes"
      className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"
    >
      {messages.length === 0 ? (
        <p className="flex h-full items-center justify-center text-center text-sm text-muted">
          Aún no hay mensajes. ¡Escribe el primero!
        </p>
      ) : (
        <ul className="flex flex-col">
          {messages.map((message, index) => (
            <MessageItem
              key={message.id}
              message={message}
              isOwn={message.sender === currentUser}
              isGroupStart={startsGroup(messages[index - 1], message)}
            />
          ))}
        </ul>
      )}
      <div ref={endRef} className="scroll-mb-5" />
    </div>
  )
}
