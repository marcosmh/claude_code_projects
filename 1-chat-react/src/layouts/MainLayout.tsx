import type { ReactNode } from 'react'

interface MainLayoutProps {
  header: ReactNode
  children: ReactNode
  footer?: ReactNode
}

export default function MainLayout({ header, children, footer }: MainLayoutProps) {
  return (
    <div className="min-h-screen px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto flex h-[calc(100dvh-2rem)] max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-lg shadow-elevation transition-colors duration-300 sm:h-[calc(100dvh-4rem)]">
        {header}
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        {footer}
      </div>
    </div>
  )
}
