import type { Theme } from '../../hooks/useTheme'
import { MoonIcon, SunIcon } from '../common/icons'

interface ThemeToggleProps {
  theme: Theme
  onToggle: () => void
}

export default function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Cambiar tema"
      title={isDark ? 'Tema oscuro' : 'Tema claro'}
      onClick={onToggle}
      className="inline-flex size-10 cursor-pointer items-center justify-center rounded-xl border border-edge bg-surface text-muted transition duration-200 hover:border-primary/50 hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
    >
      {isDark ? <MoonIcon className="size-5" /> : <SunIcon className="size-5" />}
    </button>
  )
}
