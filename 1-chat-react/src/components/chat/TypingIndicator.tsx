interface TypingIndicatorProps {
  users: string[]
}

export function typingText(users: string[]): string {
  if (users.length === 0) return ''
  if (users.length === 1) return `${users[0]} está escribiendo`
  if (users.length === 2) return `${users[0]} y ${users[1]} están escribiendo`
  if (users.length === 3) return `${users[0]}, ${users[1]} y ${users[2]} están escribiendo`
  return 'Varias personas están escribiendo'
}

// Franja de altura fija para que aparecer/desaparecer no mueva el resto de la pantalla.
export default function TypingIndicator({ users }: TypingIndicatorProps) {
  return (
    <div role="status" aria-live="polite" className="flex h-6 items-center gap-1.5 px-1 text-xs text-subtle">
      {users.length > 0 && (
        <>
          <span className="truncate italic">{typingText(users)}</span>
          <span aria-hidden="true" className="flex shrink-0 items-end gap-0.5 pb-0.5">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="size-1 animate-bounce rounded-full bg-subtle"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </span>
        </>
      )}
    </div>
  )
}
