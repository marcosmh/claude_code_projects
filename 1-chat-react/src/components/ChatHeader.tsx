import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Theme } from '../hooks/useTheme'
import ThemeToggle from './ThemeToggle'

interface ChatHeaderProps {
  username: string | null
  theme: Theme
  onToggleTheme: () => void
  // Punto de integración futuro con Spring Boot.
  onConnect: (username: string) => void
  onDisconnect: () => void
}

export default function ChatHeader({
  username,
  theme,
  onToggleTheme,
  onConnect,
  onDisconnect,
}: ChatHeaderProps) {
  const [draft, setDraft] = useState('')
  const isConnected = Boolean(username)
  const canConnect = draft.trim().length > 0

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canConnect) return
    onConnect(draft.trim())
    setDraft('')
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-slate-200 px-4 py-3 transition-colors duration-300 sm:px-6 sm:py-4 dark:border-bd-border/60">
      <div className="flex min-w-0 items-center gap-3">
        <div
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary-alt text-lg font-semibold text-white shadow-md shadow-primary/30"
        >
          C
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold sm:text-lg">ChatRoom</h1>
          <p aria-live="polite" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-bd-muted">
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${isConnected ? 'bg-success' : 'bg-slate-400'}`}
            />
            {isConnected ? 'En línea' : 'Desconectado'}
          </p>
        </div>
      </div>

      <div className="ml-auto">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>

      <div className="flex w-full min-w-0 items-center sm:w-auto">
        {isConnected ? (
          <div className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:flex-none sm:gap-3">
            <p className="min-w-0 truncate text-sm text-slate-500 dark:text-bd-muted">
              <span>Conectado como: </span>
              <span className="font-semibold text-ld-text dark:text-white">{username}</span>
            </p>
            <button
              type="button"
              onClick={onDisconnect}
              className="cursor-pointer rounded-lg border border-danger/60 px-3 py-1.5 text-sm font-medium text-danger transition duration-200 hover:bg-danger hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/50"
            >
              Desconectar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              name="username"
              placeholder="p. ej. marcos…"
              aria-label="Nombre de usuario"
              spellCheck={false}
              maxLength={24}
              autoComplete="off"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-ld-text placeholder:text-slate-400 transition duration-200 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none sm:w-48 sm:flex-none dark:border-bd-border dark:bg-bd-bg dark:text-white dark:placeholder:text-bd-muted"
            />
            <button
              type="submit"
              disabled={!canConnect}
              className="cursor-pointer rounded-lg bg-linear-to-r from-primary to-primary-alt px-4 py-1.5 text-sm font-medium text-white shadow-md shadow-primary/30 transition duration-200 hover:-translate-y-px hover:shadow-lg hover:shadow-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              Conectar
            </button>
          </form>
        )}
      </div>
    </header>
  )
}
