import type { Theme } from '../hooks/useTheme'

export default function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const next = theme === 'dark' ? 'claro' : 'oscuro'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Cambiar a tema ${next}`}
      title={`Tema ${next}`}
      className="grid size-8 shrink-0 place-items-center rounded-lg border border-line text-base hover:bg-bubble focus-visible:outline-2 focus-visible:outline-brand"
    >
      <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
    </button>
  )
}
