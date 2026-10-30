import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Button from '../common/Button'
import { AlertIcon, AtIcon } from '../common/icons'
import TextInput from '../common/TextInput'

const MAX_USERNAME_LENGTH = 24
const INPUT_ID = 'username'
const ERROR_ID = 'username-error'
const HINT_ID = 'username-hint'

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
      setError('Escribe un nombre de usuario para unirte al chat.')
      inputRef.current?.focus()
      return
    }
    onConnect(username)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5 text-left">
      <div className="flex flex-col gap-2">
        <label htmlFor={INPUT_ID} className="text-sm font-medium">
          Nombre de usuario
        </label>
        <TextInput
          ref={inputRef}
          id={INPUT_ID}
          name="username"
          inputSize="lg"
          icon={<AtIcon />}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            if (error) setError('')
          }}
          placeholder="p. ej. Anakin…"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? ERROR_ID : HINT_ID}
          maxLength={MAX_USERNAME_LENGTH}
          autoComplete="off"
          spellCheck={false}
        />
        {error ? (
          <p id={ERROR_ID} role="alert" className="flex items-center gap-1.5 text-sm text-danger">
            <AlertIcon />
            {error}
          </p>
        ) : (
          <p id={HINT_ID} className="text-xs text-subtle">
            Hasta {MAX_USERNAME_LENGTH} caracteres. No necesitas contraseña.
          </p>
        )}
      </div>
      <Button type="submit" size="lg" className="w-full">
        Conectar
      </Button>
    </form>
  )
}
