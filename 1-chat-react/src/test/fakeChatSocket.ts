import type { ChatSocketHandlers } from '../services/chatSocket'

// Sustituto de ChatSocket para las pruebas (vía vi.mock): guarda los handlers y registra lo enviado.
export class ChatSocket {
  static last: ChatSocket | null = null

  readonly sent: string[] = []
  readonly typing: boolean[] = []
  connectedAs: string | null = null
  disconnected = false
  sendResult = true

  constructor(readonly handlers: ChatSocketHandlers) {
    ChatSocket.last = this
  }

  connect(username: string) {
    this.connectedAs = username
  }

  send(text: string) {
    if (this.sendResult) this.sent.push(text)
    return this.sendResult
  }

  sendTyping(typing: boolean) {
    this.typing.push(typing)
    return true
  }

  confirmJoined() {
    this.handlers.onJoined()
  }

  disconnect() {
    this.disconnected = true
  }
}
