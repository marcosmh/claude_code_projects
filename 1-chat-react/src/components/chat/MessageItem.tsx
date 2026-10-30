import type { Message } from '../../types/message'
import Avatar from '../common/Avatar'

interface MessageItemProps {
  message: Message
  isOwn: boolean
  // Primer mensaje de una racha del mismo autor: muestra avatar, nombre y hora.
  isGroupStart: boolean
}

const timeFormatter = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' })

export default function MessageItem({ message, isOwn, isGroupStart }: MessageItemProps) {
  const { sender, sentAt, text } = message

  return (
    <li
      data-own={isOwn}
      className={`flex items-start gap-2.5 ${isOwn ? 'flex-row-reverse' : ''} ${
        isGroupStart ? 'mt-5 first:mt-0' : 'mt-1'
      }`}
    >
      {isGroupStart ? (
        <Avatar name={sender} isOwn={isOwn} />
      ) : (
        <span aria-hidden="true" className="size-8 shrink-0" />
      )}

      <div
        className={`flex min-w-0 max-w-[85%] flex-col sm:max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}
      >
        {isGroupStart && (
          <div className="mb-1 flex items-baseline gap-2 px-1 text-xs text-muted">
            <span className={`font-semibold ${isOwn ? 'text-accent' : 'text-brand'}`}>{sender}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={sentAt}>{timeFormatter.format(new Date(sentAt))}</time>
          </div>
        )}
        <p
          title={isGroupStart ? undefined : timeFormatter.format(new Date(sentAt))}
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed wrap-break-word shadow-sm transition-colors duration-200 ${
            isOwn
              ? 'rounded-tr-md bg-linear-to-r from-primary to-primary-alt text-white shadow-primary/20'
              : 'rounded-tl-md bg-surface-alt text-fg'
          }`}
        >
          {text}
        </p>
      </div>
    </li>
  )
}
