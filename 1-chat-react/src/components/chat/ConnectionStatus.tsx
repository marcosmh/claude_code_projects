interface ConnectionStatusProps {
  isConnected: boolean
}

export default function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return (
    <p aria-live="polite" className="flex items-center gap-1.5 text-xs text-muted">
      <span
        aria-hidden="true"
        className={`size-2 rounded-full ${isConnected ? 'bg-success' : 'bg-subtle'}`}
      />
      {isConnected ? 'En línea' : 'Desconectado'}
    </p>
  )
}
