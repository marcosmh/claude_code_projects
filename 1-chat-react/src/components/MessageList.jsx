import { useEffect, useRef } from 'react'
import MessageItem from './MessageItem'

export default function MessageList({ messages }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  return (
    <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
      <ul className="flex flex-col gap-5">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
      </ul>
      <div ref={endRef} />
    </div>
  )
}
