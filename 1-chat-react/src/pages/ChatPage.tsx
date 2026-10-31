import MainLayout from '../layouts/MainLayout'
import ChatHeader from '../components/chat/ChatHeader'
import ConnectScreen from '../components/chat/ConnectScreen'
import MessageList from '../components/chat/MessageList'
import ChatInput from '../components/chat/ChatInput'
import { useChat } from '../hooks/useChat'
import { useTheme } from '../hooks/useTheme'

export default function ChatPage() {
  const { theme, toggleTheme } = useTheme()
  const chat = useChat()

  // Hasta que el servidor confirma la unión se sigue mostrando la tarjeta de acceso.
  if (chat.username === null || chat.status === 'connecting') {
    return (
      <ConnectScreen
        status={chat.status}
        error={chat.error}
        onDismissError={chat.clearError}
        theme={theme}
        onToggleTheme={toggleTheme}
        onConnect={chat.connect}
      />
    )
  }

  return (
    <MainLayout
      header={
        <ChatHeader
          username={chat.username}
          status={chat.status}
          onlineCount={chat.onlineUsers.length}
          theme={theme}
          onToggleTheme={toggleTheme}
          onDisconnect={chat.disconnect}
        />
      }
      footer={
        <ChatInput
          onSend={chat.sendMessage}
          disabled={!chat.isConnected}
          error={chat.error}
          onDismissError={chat.clearError}
          onTypingChange={chat.setTyping}
          typingUsers={chat.typingUsers}
        />
      }
    >
      <MessageList messages={chat.messages} notices={chat.notices} currentUser={chat.username} />
    </MainLayout>
  )
}
