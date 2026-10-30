import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'danger'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const base =
  'cursor-pointer text-sm font-medium transition duration-200 focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed'

const variants: Record<Variant, string> = {
  primary:
    'bg-linear-to-r from-primary to-primary-alt text-white shadow-md shadow-primary/30 hover:-translate-y-px hover:shadow-lg hover:shadow-primary/40 focus-visible:ring-primary/60 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none',
  danger:
    'border border-danger/60 text-danger hover:bg-danger hover:text-white focus-visible:ring-danger/50',
}

const sizes: Record<Size, string> = {
  sm: 'rounded-lg px-4 py-1.5',
  md: 'rounded-xl px-4 py-2.5 sm:px-6',
}

export default function Button({
  variant = 'primary',
  size = 'sm',
  type = 'button',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  )
}
