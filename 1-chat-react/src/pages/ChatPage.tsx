import MainLayout from '../layouts/MainLayout'
import ChatHeader from '../components/chat/ChatHeader'
import ConnectScreen from '../components/chat/ConnectScreen'
import MessageList from '../components/chat/MessageList'
import ChatInput from '../components/chat/ChatInput'
import { useChat } from '../hooks/useChat'
import { useTheme } from '../hooks/useTheme'

export default function ChatPage() {
  const { theme, toggleTheme } = useTheme()
  const { username, messages, connect, disconnect, sendMessage } = useChat()

  if (username === null) {
    return <ConnectScreen theme={theme} onToggleTheme={toggleTheme} onConnect={connect} />
  }

  return (
    <MainLayout
      header={
        <ChatHeader
          username={username}
          theme={theme}
          onToggleTheme={toggleTheme}
          onDisconnect={disconnect}
        />
      }
      footer={<ChatInput onSend={sendMessage} />}
    >
      <MessageList messages={messages} currentUser={username} />
    </MainLayout>
  )
}
