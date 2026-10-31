import type { ConnectionState } from '../../types/chat'

interface ConnectionStatusProps {
  status: ConnectionState
}

const labels: Record<ConnectionState, string> = {
  connected: 'Online',
  connecting: 'Conectando…',
  reconnecting: 'Reconectando…',
  disconnected: 'Offline',
}

// Badge de estado. Usa tokens con contraste AA sobre su fondo tintado.
export default function ConnectionStatus({ status }: ConnectionStatusProps) {
  const isOnline = status === 'connected'
  const isBusy = status === 'connecting' || status === 'reconnecting'

  return (
    <p
      aria-live="polite"
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isOnline ? 'bg-ok/10 text-ok' : 'bg-surface-alt text-subtle'
      }`}
    >
      <span className="relative flex size-2" aria-hidden="true">
        {(isOnline || isBusy) && (
          <span
            className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${
              isOnline ? 'bg-success' : 'bg-primary'
            }`}
          />
        )}
        <span
          className={`relative inline-flex size-2 rounded-full ${
            isOnline ? 'bg-success' : isBusy ? 'bg-primary' : 'bg-subtle'
          }`}
        />
      </span>
      {labels[status]}
    </p>
  )
}
