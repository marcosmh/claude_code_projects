import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Button from '../common/Button'
import TextInput from '../common/TextInput'

const MAX_USERNAME_LENGTH = 24
const ERROR_ID = 'username-error'

interface ConnectFormProps {
  // Punto de integración futuro con Spring Boot.
  onConnect: (username: string) => void
}

export default function ConnectForm({ onConnect }: ConnectFormProps) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const username = draft.trim()
    if (!username) {
      setError('Ingresa un nombre de usuario.')
      inputRef.current?.focus()
      return
    }
    onConnect(username)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="flex min-w-0 items-center gap-2">
        <TextInput
          ref={inputRef}
          name="username"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            if (error) setError('')
          }}
          placeholder="p. ej. Anakin…"
          aria-label="Nombre de usuario"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? ERROR_ID : undefined}
          maxLength={MAX_USERNAME_LENGTH}
          autoComplete="off"
          spellCheck={false}
          className="flex-1 sm:w-48 sm:flex-none"
        />
        <Button type="submit">Conectar</Button>
      </div>
      {error && (
        <p id={ERROR_ID} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </form>
  )
}
