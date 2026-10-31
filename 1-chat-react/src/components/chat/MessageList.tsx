import { useEffect, useMemo, useRef } from 'react'
import type { SystemNotice } from '../../types/chat'
import type { Message } from '../../types/message'
import MessageItem from './MessageItem'

interface MessageListProps {
  messages: Message[]
  currentUser: string
  // Mensajes del sistema (conexiones/salidas) que se intercalan por hora entre los mensajes.
  notices?: SystemNotice[]
}

// Mensajes seguidos del mismo autor dentro de esta ventana se agrupan bajo un solo encabezado.
const GROUP_WINDOW_MS = 5 * 60 * 1000

const noNotices: SystemNotice[] = []

type TimelineItem =
  | { kind: 'message'; key: string; at: number; message: Message }
  | { kind: 'notice'; key: string; at: number; notice: SystemNotice }

function startsGroup(previous: TimelineItem | undefined, current: Message): boolean {
  if (previous?.kind !== 'message' || previous.message.sender !== current.sender) return true
  return new Date(current.sentAt).getTime() - new Date(previous.message.sentAt).getTime() > GROUP_WINDOW_MS
}

export default function MessageList({ messages, currentUser, notices = noNotices }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null)

  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [
      ...messages.map((message): TimelineItem => ({
        kind: 'message',
        key: `m-${message.id}`,
        at: new Date(message.sentAt).getTime(),
        message,
      })),
      ...notices.map((notice): TimelineItem => ({
        kind: 'notice',
        key: `n-${notice.id}`,
        at: new Date(notice.at).getTime(),
        notice,
      })),
    ]
    return items.sort((a, b) => a.at - b.at)
  }, [messages, notices])

  // Solo al cambiar la cantidad de elementos, no en cada render del padre.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [timeline.length])

  return (
    <div
      role="log"
      aria-label="Mensajes"
      className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"
    >
      {timeline.length === 0 ? (
        <p className="flex h-full items-center justify-center text-center text-sm text-muted">
          Aún no hay mensajes. ¡Escribe el primero!
        </p>
      ) : (
        <ul className="flex flex-col">
          {timeline.map((item, index) =>
            item.kind === 'message' ? (
              <MessageItem
                key={item.key}
                message={item.message}
                isOwn={item.message.sender === currentUser}
                isGroupStart={startsGroup(timeline[index - 1], item.message)}
              />
            ) : (
              <li key={item.key} className="my-3 flex justify-center">
                <span className="rounded-full bg-surface-alt px-3 py-1 text-xs text-subtle">
                  {item.notice.text}
                </span>
              </li>
            ),
          )}
        </ul>
      )}
      <div ref={endRef} className="scroll-mb-5" />
    </div>
  )
}
