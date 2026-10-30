import { useCallback, useState } from 'react'

// Solo visual: sin autenticación. Al integrar Spring Boot aquí vivirán los estados
// connecting / reconnecting / error y la conexión WebSocket real.
export function useConnection() {
  const [username, setUsername] = useState<string | null>(null)

  const connect = useCallback((name: string) => setUsername(name), [])
  const disconnect = useCallback(() => setUsername(null), [])

  return { username, isConnected: username !== null, connect, disconnect }
}
