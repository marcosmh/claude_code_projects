import { useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'

interface ChatInputProps {
  // Punto de integración futuro (WebSocket/STOMP o REST con Spring Boot).
  onSend?: (text: string) => void
}

export default function ChatInput({ onSend }: ChatInputProps) {
  const [value, setValue] = useState('')

  const submit = () => {
    const text = value.trim()
    if (!text) return
    onSend?.(text)
    setValue('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // No enviar mientras un IME (japonés, chino, etc.) confirma una composición.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div className="border-t border-slate-200 p-3 transition-colors duration-300 sm:p-4 dark:border-bd-border/60">
      <div className="flex items-center gap-2 sm:gap-3">
        <input
          type="text"
          name="message"
          value={value}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje…"
          aria-label="Mensaje"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-ld-text placeholder:text-slate-400 transition duration-200 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none dark:border-bd-border dark:bg-bd-bg dark:text-white dark:placeholder:text-bd-muted"
        />
        <button
          type="button"
          onClick={submit}
          className="cursor-pointer rounded-xl bg-linear-to-r from-info to-primary-alt px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-info/25 transition duration-200 hover:-translate-y-px hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-info/60 sm:px-6"
        >
          Enviar
        </button>
      </div>
      <p className="mt-2 hidden text-xs text-slate-400 sm:block dark:text-bd-muted">
        Presiona Enter para enviar
      </p>
    </div>
  )
}
