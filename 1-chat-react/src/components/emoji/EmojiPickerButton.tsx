import { useEffect, useId, useRef, useState } from 'react'
import { SmileIcon } from '../common/icons'
import EmojiPicker from './EmojiPicker'

interface EmojiPickerButtonProps {
  onSelect: (emoji: string) => void
  disabled?: boolean
}

// Botón + ventana emergente. El panel se posiciona respecto al ancestro `relative` más cercano (el formulario),
// así en móvil ocupa el ancho disponible. Se cierra con Escape, al pulsar fuera o al volver a pulsar el botón.
export default function EmojiPickerButton({ onSelect, disabled = false }: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const isOpen = open && !disabled

  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-label="Emojis"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={() => setOpen((current) => !current)}
        className="flex size-10 items-center justify-center rounded-xl text-muted transition-colors duration-150 hover:bg-surface-alt hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50"
      >
        <SmileIcon className="size-5" />
      </button>
      {isOpen && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Selector de emojis"
          className="animate-enter absolute inset-x-3 bottom-full z-10 mb-2 rounded-2xl border border-edge bg-surface p-3 shadow-xl shadow-elevation sm:inset-x-auto sm:right-6 sm:w-80"
        >
          <EmojiPicker onSelect={onSelect} />
        </div>
      )}
    </div>
  )
}
