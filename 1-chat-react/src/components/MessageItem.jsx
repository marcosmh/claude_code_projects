export default function MessageItem({ message }) {
  const { user, time, text, own } = message

  return (
    <li className={`flex flex-col ${own ? 'items-end' : 'items-start'}`}>
      <div className="mb-1 flex items-baseline gap-2 px-1 text-xs text-slate-500 dark:text-bd-muted">
        <span className={`font-semibold ${own ? 'text-accent' : 'text-info'}`}>{user}</span>
        <span aria-hidden="true">·</span>
        <time>{time}</time>
      </div>
      <p
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm transition-colors duration-200 sm:max-w-[70%] ${
          own
            ? 'rounded-br-md bg-linear-to-r from-primary to-primary-alt text-white shadow-primary/20'
            : 'rounded-bl-md bg-slate-100 text-ld-text dark:bg-bd-card-alt dark:text-white'
        }`}
      >
        {text}
      </p>
    </li>
  )
}
