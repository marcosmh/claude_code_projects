import { useEffect, useRef } from 'react'
import type { Message } from '../../types/message'
import MessageItem from './MessageItem'

interface MessageListProps {
  messages: Message[]
  currentUser: string
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
      <ul className="flex flex-col gap-5">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} isOwn={message.sender === currentUser} />
        ))}
      </ul>
      <div ref={endRef} />
    </div>
  )
}
