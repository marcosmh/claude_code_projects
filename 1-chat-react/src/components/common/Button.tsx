import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const base =
  'inline-flex cursor-pointer items-center justify-center gap-2 font-medium transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100'

const variants: Record<Variant, string> = {
  primary:
    'bg-linear-to-r from-primary to-primary-alt text-white shadow-md shadow-primary/30 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/40 focus-visible:ring-primary disabled:scale-100 disabled:opacity-50 disabled:shadow-none',
  danger:
    'border border-danger/60 text-danger hover:bg-danger hover:text-on-danger focus-visible:ring-danger',
  ghost: 'text-muted hover:bg-surface-alt hover:text-fg focus-visible:ring-primary',
}

const sizes: Record<Size, string> = {
  sm: 'rounded-xl px-3.5 py-2 text-sm',
  md: 'rounded-xl px-5 py-2.5 text-sm',
  lg: 'rounded-xl px-6 py-3 text-base',
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
