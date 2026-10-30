import type { Theme } from '../../hooks/useTheme'
import BrandLogo from '../layout/BrandLogo'
import ThemeToggle from '../layout/ThemeToggle'
import ConnectForm from './ConnectForm'
import ConnectionStatus from './ConnectionStatus'

interface ConnectScreenProps {
  theme: Theme
  onToggleTheme: () => void
  onConnect: (username: string) => void
}

// Pantalla de acceso: tarjeta centrada con la marca y el formulario (no es un login real).
export default function ConnectScreen({ theme, onToggleTheme, onConnect }: ConnectScreenProps) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 size-112 -translate-x-[90%] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/2 size-112 -translate-x-[10%] rounded-full bg-[#e14eca]/15 blur-3xl" />
      </div>

      <div className="mx-auto flex w-full max-w-5xl items-center justify-between py-2">
        <ConnectionStatus isConnected={false} />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>

      <main
        id="main"
        className="mx-auto flex w-full flex-1 items-center justify-center py-6"
      >
        <section
          aria-labelledby="connect-title"
          className="animate-enter w-full max-w-md rounded-3xl border border-line bg-surface p-6 text-center shadow-xl shadow-elevation sm:p-10"
        >
          <div className="flex justify-center">
            <BrandLogo size="lg" />
          </div>
          <h1 id="connect-title" className="mt-6 text-balance text-2xl font-semibold sm:text-3xl">
            Bienvenido a <span translate="no">ChatRoom</span>
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-pretty text-sm text-muted sm:text-base">
            Elige un nombre de usuario y únete a la conversación.
          </p>
          <ConnectForm onConnect={onConnect} />
        </section>
      </main>
    </div>
  )
}
