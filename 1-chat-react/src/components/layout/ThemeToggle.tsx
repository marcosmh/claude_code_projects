import type { Theme } from '../../hooks/useTheme'

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
      onClick={onToggle}
      className="flex cursor-pointer items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <span className="hidden text-xs font-medium text-muted sm:inline">
        {isDark ? 'Dark' : 'Light'}
      </span>
      <span
        className={`relative inline-flex h-7 w-13 items-center rounded-full transition-colors duration-300 ${
          isDark ? 'bg-linear-to-r from-primary to-primary-alt' : 'bg-edge'
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute left-0.5 flex size-6 items-center justify-center rounded-full bg-white text-xs shadow transition-transform duration-300 ${
            isDark ? 'translate-x-6' : 'translate-x-0'
          }`}
        >
          {isDark ? '🌙' : '☀️'}
        </span>
      </span>
    </button>
  )
}
