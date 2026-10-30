import Avatar from '../common/Avatar'
import Button from '../common/Button'

interface UserBadgeProps {
  username: string
  onDisconnect: () => void
}

export default function UserBadge({ username, onDisconnect }: UserBadgeProps) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:flex-none sm:gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <Avatar name={username} isOwn size="sm" />
        <p className="flex min-w-0 gap-1 text-sm text-muted">
          <span className="shrink-0 max-sm:sr-only">Conectado como:</span>
          <span className="truncate font-semibold text-fg">{username}</span>
        </p>
      </div>
      <Button variant="danger" onClick={onDisconnect}>
        Desconectar
      </Button>
    </div>
  )
}
