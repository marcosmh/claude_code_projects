export default function ChatLayout({ header, children, footer }) {
  return (
    <div className="min-h-screen px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto flex h-[calc(100dvh-2rem)] max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-300/40 transition-colors duration-300 sm:h-[calc(100dvh-4rem)] dark:border-bd-border/60 dark:bg-bd-card dark:shadow-black/30">
        {header}
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        {footer}
      </div>
    </div>
  )
}
