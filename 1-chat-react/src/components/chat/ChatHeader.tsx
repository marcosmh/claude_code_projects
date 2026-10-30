import type { Theme } from '../../hooks/useTheme'
import Button from '../common/Button'
import { LogOutIcon } from '../common/icons'
import BrandLogo from '../layout/BrandLogo'
import ThemeToggle from '../layout/ThemeToggle'
import ConnectionStatus from './ConnectionStatus'
import UserBadge from './UserBadge'

interface ChatHeaderProps {
  username: string
  theme: Theme
  onToggleTheme: () => void
  onDisconnect: () => void
}

export default function ChatHeader({ username, theme, onToggleTheme, onDisconnect }: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex min-w-0 items-center gap-3">
        <BrandLogo />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 translate="no" className="truncate text-base font-semibold leading-none sm:text-lg">
            ChatRoom
          </h1>
          <ConnectionStatus isConnected />
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <UserBadge username={username} />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <Button variant="danger" size="sm" onClick={onDisconnect} className="max-sm:size-10 max-sm:p-0">
          <LogOutIcon />
          <span className="max-sm:sr-only">Desconectar</span>
        </Button>
      </div>
    </header>
  )
}
