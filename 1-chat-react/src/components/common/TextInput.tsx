import type { ComponentProps, ReactNode } from 'react'

type Size = 'md' | 'lg'

interface TextInputProps extends Omit<ComponentProps<'input'>, 'size'> {
  inputSize?: Size
  // Icono decorativo a la izquierda. `className` se aplica al contenedor.
  icon?: ReactNode
}

const base =
  'w-full min-w-0 border border-edge bg-field text-fg placeholder:text-subtle transition duration-200 hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/20 focus:outline-none aria-invalid:border-danger aria-invalid:focus:ring-danger/20'

const sizes: Record<Size, string> = {
  md: 'rounded-xl px-4 py-2.5 text-sm',
  lg: 'rounded-xl px-4 py-3 text-base',
}

export default function TextInput({
  inputSize = 'md',
  type = 'text',
  icon,
  className = '',
  ...props
}: TextInputProps) {
  return (
    <div className={`relative min-w-0 ${className}`}>
      {icon && (
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-subtle">
          {icon}
        </span>
      )}
      <input
        type={type}
        className={`${base} ${sizes[inputSize]} ${icon ? 'pl-10' : ''}`}
        {...props}
      />
    </div>
  )
}
