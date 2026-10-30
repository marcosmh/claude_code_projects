import { useState } from 'react'
import type { FormEvent } from 'react'
import Button from '../common/Button'
import TextInput from '../common/TextInput'

interface ChatInputProps {
  // Punto de integración futuro (WebSocket/STOMP o REST con Spring Boot).
  onSend?: (text: string) => void
}

export default function ChatInput({ onSend }: ChatInputProps) {
  const [value, setValue] = useState('')

  // Enter y el botón comparten este camino; el navegador ya ignora Enter durante una composición IME.
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = value.trim()
    if (!text) return
    onSend?.(text)
    setValue('')
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-line p-3 transition-colors duration-300 sm:p-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <TextInput
          inputSize="md"
          name="message"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Escribe un mensaje…"
          aria-label="Mensaje"
          autoComplete="off"
          className="flex-1"
        />
        <Button type="submit" size="md">
          Enviar
        </Button>
      </div>
      <p className="mt-2 hidden text-xs text-subtle sm:block">Presiona Enter para enviar</p>
    </form>
  )
}
