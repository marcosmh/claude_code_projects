import { useState } from 'react'
import { EMOJI_CATEGORIES } from '../../data/emojis'
import type { EmojiCategory } from '../../data/emojis'

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  categories?: EmojiCategory[]
}

// Panel presentacional: pestañas por categoría + cuadrícula. No conoce el campo de texto ni dónde se inserta.
export default function EmojiPicker({ onSelect, categories = EMOJI_CATEGORIES }: EmojiPickerProps) {
  const [activeId, setActiveId] = useState(categories[0]?.id)
  const active = categories.find((category) => category.id === activeId) ?? categories[0]
  if (!active) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 border-b border-line pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            aria-label={category.label}
            aria-pressed={category.id === active.id}
            onClick={() => setActiveId(category.id)}
            className="flex size-9 items-center justify-center rounded-lg text-lg transition-colors duration-150 hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-pressed:bg-surface-alt aria-pressed:ring-1 aria-pressed:ring-edge"
          >
            <span aria-hidden="true">{category.icon}</span>
          </button>
        ))}
      </div>
      <p className="px-1 text-xs text-muted">{active.label}</p>
      <ul className="scroll-thin grid max-h-44 grid-cols-8 gap-0.5 overflow-y-auto overflow-x-hidden overscroll-contain">
        {active.emojis.map((emoji) => (
          <li key={emoji} className="contents">
            <button
              type="button"
              onClick={() => onSelect(emoji)}
              className="flex h-9 w-full items-center justify-center rounded-lg text-xl transition-colors duration-150 hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {emoji}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
