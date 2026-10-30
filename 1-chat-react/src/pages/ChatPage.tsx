import { useMemo, useState } from 'react'
import ChatLayout from '../layouts/ChatLayout'
import ChatHeader from '../components/ChatHeader'
import EmptyState from '../components/EmptyState'
import MessageList from '../components/MessageList'
import ChatInput from '../components/ChatInput'
import { useTheme } from '../hooks/useTheme'
import { getMockMessages } from '../data/mockMessages'

export default function ChatPage() {
  const { theme, toggleTheme } = useTheme()
  // Solo visual: sin autenticación. El nombre lo gestionará Spring Boot más adelante.
  const [username, setUsername] = useState<string | null>(null)

  // Referencia estable: solo cambia al conectar/desconectar.
  const messages = useMemo(() => (username ? getMockMessages(username) : []), [username])

  // Solo visual: el envío real se implementará con Spring Boot.
  const handleSend = () => {}

  return (
    <ChatLayout
      header={
        <ChatHeader
          username={username}
          theme={theme}
          onToggleTheme={toggleTheme}
          onConnect={setUsername}
          onDisconnect={() => setUsername(null)}
        />
      }
      footer={username ? <ChatInput onSend={handleSend} /> : null}
    >
      {username ? <MessageList messages={messages} currentUser={username} /> : <EmptyState />}
    </ChatLayout>
  )
}
