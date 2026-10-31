import { useCallback, useEffect, useRef } from 'react'

// Tras este tiempo sin teclear se avisa que dejó de escribir.
const IDLE_MS = 2500
// Mientras siga tecleando se repite USER_TYPING con esta frecuencia máxima (los demás lo caducan solos).
const KEEP_ALIVE_MS = 3000

// Convierte la actividad del campo de texto en pocos eventos: uno al empezar, uno de refresco cada KEEP_ALIVE_MS
// y uno al parar (por inactividad, texto vacío, envío o desmontaje). Nunca uno por pulsación.
export function useTypingNotifier(onTypingChange?: (typing: boolean) => void) {
  const callbackRef = useRef(onTypingChange)
  const typingRef = useRef(false)
  const lastSentRef = useRef(0)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    callbackRef.current = onTypingChange
  }, [onTypingChange])

  const stop = useCallback(() => {
    clearTimeout(idleTimerRef.current)
    if (!typingRef.current) return
    typingRef.current = false
    callbackRef.current?.(false)
  }, [])

  const notifyInput = useCallback(
    (text: string) => {
      if (text.trim().length === 0) {
        stop()
        return
      }
      const now = Date.now()
      if (!typingRef.current || now - lastSentRef.current >= KEEP_ALIVE_MS) {
        typingRef.current = true
        lastSentRef.current = now
        callbackRef.current?.(true)
      }
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(stop, IDLE_MS)
    },
    [stop],
  )

  useEffect(() => stop, [stop])

  return { notifyInput, stop }
}
