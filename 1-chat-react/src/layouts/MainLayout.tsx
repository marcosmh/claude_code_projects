import type { ReactNode } from 'react'

interface MainLayoutProps {
  header: ReactNode
  children: ReactNode
  footer?: ReactNode
}

export default function MainLayout({ header, children, footer }: MainLayoutProps) {
  return (
    <div className="min-h-dvh px-0 py-0 sm:px-6 sm:py-8">
      <div className="animate-enter mx-auto flex h-dvh max-w-4xl flex-col overflow-hidden border-line bg-surface shadow-xl shadow-elevation sm:h-[calc(100dvh-4rem)] sm:rounded-3xl sm:border">
        {header}
        <main id="main" className="flex min-h-0 flex-1 flex-col">
          {children}
        </main>
        {footer}
      </div>
    </div>
  )
}
