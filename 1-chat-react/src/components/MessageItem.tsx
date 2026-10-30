import type { Message } from '../types/message'

interface MessageItemProps {
  message: Message
  isOwn: boolean
}

const timeFormatter = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' })

export default function MessageItem({ message, isOwn }: MessageItemProps) {
  const { sender, sentAt, text } = message

  return (
    <li className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
      <div className="mb-1 flex items-baseline gap-2 px-1 text-xs text-slate-500 dark:text-bd-muted">
        <span className={`font-semibold ${isOwn ? 'text-accent' : 'text-info'}`}>{sender}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={sentAt}>{timeFormatter.format(new Date(sentAt))}</time>
      </div>
      <p
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed wrap-break-word shadow-sm transition-colors duration-200 sm:max-w-[70%] ${
          isOwn
            ? 'rounded-br-md bg-linear-to-r from-primary to-primary-alt text-white shadow-primary/20'
            : 'rounded-bl-md bg-slate-100 text-ld-text dark:bg-bd-card-alt dark:text-white'
        }`}
      >
        {text}
      </p>
    </li>
  )
}
