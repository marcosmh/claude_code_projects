import ChatPage from './pages/ChatPage'

export default function App() {
  return (
    <>
      <a
        href="#main"
        className="sr-only rounded-lg bg-surface px-4 py-2 text-sm font-medium text-fg shadow-lg focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:ring-2 focus:ring-primary"
      >
        Saltar al contenido
      </a>
      <ChatPage />
    </>
  )
}
