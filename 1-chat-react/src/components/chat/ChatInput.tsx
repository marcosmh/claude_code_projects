import { useState } from 'react'
import type { FormEvent } from 'react'
import Button from '../common/Button'
import { SendIcon } from '../common/icons'

interface ChatInputProps {
  // Punto de integración futuro (WebSocket/STOMP o REST con Spring Boot).
  onSend?: (text: string) => void
}

export default function ChatInput({ onSend }: ChatInputProps) {
  const [value, setValue] = useState('')
  const canSend = value.trim().length > 0

  // Enter y el botón comparten este camino; el navegador ya ignora Enter durante una composición IME.
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = value.trim()
    if (!text) return
    onSend?.(text)
    setValue('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-line bg-surface px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center gap-2 rounded-2xl border border-edge bg-field p-1.5 pl-4 transition duration-200 hover:border-primary/50 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/20">
        <input
          type="text"
          name="message"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Escribe un mensaje…"
          aria-label="Mensaje"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-2 text-sm text-fg placeholder:text-subtle focus:outline-none"
        />
        <Button type="submit" size="md" disabled={!canSend} className="max-sm:size-10 max-sm:p-0">
          <SendIcon />
          <span className="max-sm:sr-only">Enviar</span>
        </Button>
      </div>
      <p className="mt-2 hidden px-1 text-xs text-subtle sm:block">
        <kbd className="rounded border border-edge bg-surface-alt px-1.5 py-0.5 font-sans text-[11px]">Enter</kbd>{' '}
        para enviar
      </p>
    </form>
  )
}
