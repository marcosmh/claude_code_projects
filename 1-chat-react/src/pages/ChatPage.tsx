import MainLayout from '../layouts/MainLayout'
import ChatHeader from '../components/chat/ChatHeader'
import EmptyState from '../components/chat/EmptyState'
import MessageList from '../components/chat/MessageList'
import ChatInput from '../components/chat/ChatInput'
import { useChat } from '../hooks/useChat'
import { useTheme } from '../hooks/useTheme'

export default function ChatPage() {
  const { theme, toggleTheme } = useTheme()
  const { username, messages, connect, disconnect, sendMessage } = useChat()

  return (
    <MainLayout
      header={
        <ChatHeader
          username={username}
          theme={theme}
          onToggleTheme={toggleTheme}
          onConnect={connect}
          onDisconnect={disconnect}
        />
      }
      footer={username ? <ChatInput onSend={sendMessage} /> : null}
    >
      {username ? <MessageList messages={messages} currentUser={username} /> : <EmptyState />}
    </MainLayout>
  )
}
