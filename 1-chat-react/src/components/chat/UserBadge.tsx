import Avatar from '../common/Avatar'

interface UserBadgeProps {
  username: string
}

export default function UserBadge({ username }: UserBadgeProps) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-line bg-surface-alt py-1.5 pl-1.5 pr-3 max-sm:border-0 max-sm:bg-transparent max-sm:p-0">
      <Avatar name={username} isOwn />
      <p className="flex min-w-0 gap-1 text-sm text-muted">
        <span className="shrink-0 max-lg:sr-only">Conectado como</span>
        <span className="max-w-28 truncate font-semibold text-fg max-sm:sr-only sm:max-w-40">{username}</span>
      </p>
    </div>
  )
}
