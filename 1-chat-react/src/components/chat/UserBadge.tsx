import Button from '../common/Button'

interface UserBadgeProps {
  username: string
  onDisconnect: () => void
}

export default function UserBadge({ username, onDisconnect }: UserBadgeProps) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:flex-none sm:gap-3">
      <p className="min-w-0 truncate text-sm text-muted">
        Conectado como: <span className="font-semibold text-fg">{username}</span>
      </p>
      <Button variant="danger" onClick={onDisconnect}>
        Desconectar
      </Button>
    </div>
  )
}
