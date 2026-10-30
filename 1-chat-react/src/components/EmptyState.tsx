export default function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <div
        aria-hidden="true"
        className="flex size-16 items-center justify-center rounded-2xl bg-linear-to-br from-primary/15 to-primary-alt/15 text-3xl"
      >
        💬
      </div>
      <h2 className="text-lg font-semibold sm:text-xl">Bienvenido a ChatRoom</h2>
      <p className="max-w-xs text-sm text-slate-500 dark:text-bd-muted">
        Ingresa un nombre de usuario para conectarte al chat.
      </p>
    </div>
  )
}
