import type { Theme } from '../../hooks/useTheme'
import BrandLogo from '../layout/BrandLogo'
import ThemeToggle from '../layout/ThemeToggle'
import ConnectForm from './ConnectForm'
import ConnectionStatus from './ConnectionStatus'
import UserBadge from './UserBadge'

interface ChatHeaderProps {
  username: string | null
  theme: Theme
  onToggleTheme: () => void
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
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line px-4 py-3 transition-colors duration-300 sm:px-6 sm:py-4">
      <div className="flex min-w-0 items-center gap-3">
        <BrandLogo />
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold sm:text-lg">ChatRoom</h1>
          <ConnectionStatus isConnected={username !== null} />
        </div>
      </div>

      <div className="ml-auto">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>

      <div className="flex w-full min-w-0 items-start sm:w-auto">
        {username !== null ? (
          <UserBadge username={username} onDisconnect={onDisconnect} />
        ) : (
          <ConnectForm onConnect={onConnect} />
        )}
      </div>
    </header>
  )
}
