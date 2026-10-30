import { useEffect, useState } from 'react'
import ChatLayout from '../layouts/ChatLayout'
import ChatHeader from '../components/ChatHeader'
import EmptyState from '../components/EmptyState'
import MessageList from '../components/MessageList'
import ChatInput from '../components/ChatInput'
import { mockMessages } from '../data/mockMessages'

export default function ChatPage() {
  const [theme, setTheme] = useState('dark')
  // Solo visual: sin autenticación. El nombre lo gestionará Spring Boot más adelante.
  const [username, setUsername] = useState(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Solo visual: el envío real se implementará con Spring Boot.
  const handleSend = () => {}

  // Los mensajes propios muestran el nombre con el que se conectó el usuario.
  const messages = mockMessages.map((m) => (m.own ? { ...m, user: username } : m))

  return (
    <ChatLayout
      header={
        <ChatHeader
          username={username}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          onConnect={setUsername}
          onDisconnect={() => setUsername(null)}
        />
      }
      footer={username ? <ChatInput onSend={handleSend} /> : null}
    >
      {username ? <MessageList messages={messages} /> : <EmptyState />}
    </ChatLayout>
  )
}
