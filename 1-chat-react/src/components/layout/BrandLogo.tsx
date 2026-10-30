import { ChatBubbleIcon } from '../common/icons'

type Size = 'md' | 'lg'

const sizes: Record<Size, string> = {
  md: 'size-10 rounded-xl',
  lg: 'size-16 rounded-2xl',
}

export default function BrandLogo({ size = 'md' }: { size?: Size }) {
  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center bg-linear-to-br from-primary via-primary-alt to-[#e14eca] text-white shadow-lg shadow-primary/30 ${sizes[size]}`}
    >
      <ChatBubbleIcon className={size === 'lg' ? 'size-8' : 'size-5'} />
    </div>
  )
}
