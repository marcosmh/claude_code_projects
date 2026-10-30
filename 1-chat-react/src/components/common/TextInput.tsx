import type { ComponentProps } from 'react'

type Size = 'sm' | 'md'

interface TextInputProps extends Omit<ComponentProps<'input'>, 'size'> {
  inputSize?: Size
}

const base =
  'min-w-0 border border-edge bg-field text-sm text-fg placeholder:text-subtle transition duration-200 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none aria-invalid:border-danger aria-invalid:focus:ring-danger/30'

const sizes: Record<Size, string> = {
  sm: 'rounded-lg px-3 py-1.5',
  md: 'rounded-xl px-4 py-2.5',
}

export default function TextInput({
  inputSize = 'sm',
  type = 'text',
  className = '',
  ...props
}: TextInputProps) {
  return <input type={type} className={`${base} ${sizes[inputSize]} ${className}`} {...props} />
}
