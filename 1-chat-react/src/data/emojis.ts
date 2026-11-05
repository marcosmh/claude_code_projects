// Catálogo del selector. Es solo datos: añadir categorías ("Recientes", "Favoritos", stickers...) o emojis
// no toca ningún componente. `icon` es el emoji que identifica la pestaña.
export interface EmojiCategory {
  id: string
  label: string
  icon: string
  emojis: string[]
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'faces',
    label: 'Caras',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘',
      '😋', '😛', '😜', '🤪', '😎', '🤓', '🥳', '😏', '😒', '😞', '😢', '😭', '😤', '😡', '🤯', '😱',
      '😳', '🥺', '😴', '🤔', '🤗', '🙄', '😬', '🤐',
    ],
  },
  {
    id: 'gestures',
    label: 'Gestos',
    icon: '👋',
    emojis: [
      '👋', '🤚', '✋', '🖖', '👌', '🤌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '👍',
      '👎', '✊', '👊', '🤛', '👏', '🙌', '👐', '🤝', '🙏', '✍️', '💪', '🫶', '🫡', '💅',
    ],
  },
  {
    id: 'symbols',
    label: 'Corazones y símbolos',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
      '✨', '⭐', '🌟', '💫', '🔥', '💥', '💯', '✅', '❌', '⚠️', '❓', '❗', '💤', '💢',
    ],
  },
  {
    id: 'celebration',
    label: 'Celebración y objetos',
    icon: '🎉',
    emojis: [
      '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🚀', '✈️', '🚗', '⚡', '☀️', '🌙', '🌈', '☕', '🍕', '🍔',
      '🍟', '🍰', '🍺', '🎵', '🎮', '💻', '📱', '📷', '💡', '📌', '🔔', '⏰', '🐶', '🐱',
    ],
  },
]
