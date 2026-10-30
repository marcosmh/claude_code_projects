interface ConnectionStatusProps {
  isConnected: boolean
}

// Badge de estado: Online / Offline. Usa tokens con contraste AA sobre su fondo tintado.
export default function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return (
    <p
      aria-live="polite"
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isConnected ? 'bg-ok/10 text-ok' : 'bg-surface-alt text-subtle'
      }`}
    >
      <span className="relative flex size-2" aria-hidden="true">
        {isConnected && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
        )}
        <span
          className={`relative inline-flex size-2 rounded-full ${isConnected ? 'bg-success' : 'bg-subtle'}`}
        />
      </span>
      {isConnected ? 'Online' : 'Offline'}
    </p>
  )
}
