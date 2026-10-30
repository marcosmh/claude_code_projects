type Size = 'sm' | 'md'

interface AvatarProps {
  name: string
  isOwn?: boolean
  size?: Size
}

const sizes: Record<Size, string> = {
  sm: 'size-6 text-[10px]',
  md: 'size-8 text-xs',
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const letters = words.length === 1 ? [...words[0]].slice(0, 2) : [words[0][0], words[1][0]]
  return letters.join('').toUpperCase()
}

// Decorativo: el nombre ya se muestra como texto junto al avatar.
export default function Avatar({ name, isOwn = false, size = 'md' }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 select-none items-center justify-center rounded-full font-semibold ${sizes[size]} ${
        isOwn
          ? 'bg-linear-to-br from-primary to-primary-alt text-white shadow-sm shadow-primary/30'
          : 'bg-surface-alt text-fg ring-1 ring-edge'
      }`}
    >
      {getInitials(name)}
    </span>
  )
}
