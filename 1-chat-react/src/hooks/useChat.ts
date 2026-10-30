import { useCallback } from 'react'
import { useConnection } from './useConnection'
import { useMessages } from './useMessages'

export function useChat() {
  const { username, isConnected, connect, disconnect } = useConnection()
  const messages = useMessages(username)

  // Solo visual: el envío real se implementará con Spring Boot.
  const sendMessage = useCallback((text: string) => {
    void text
  }, [])

  return { username, isConnected, messages, connect, disconnect, sendMessage }
}
