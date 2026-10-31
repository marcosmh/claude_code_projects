import { Client } from '@stomp/stompjs'
import type { IMessage } from '@stomp/stompjs'
import { env } from '../config/env'
import type { PresenceEvent, SystemNotice, TypingEvent } from '../types/chat'
import type { Message } from '../types/message'
import type { ChatMessageDto, ErrorDto, SystemEventDto, TypingEventDto, UserSessionDto } from './dto'
import { toMessage, toPresenceEvent, toSystemNotice, toTypingEvent } from './mappers'

// Destinos STOMP del backend.
const DEST_JOIN = '/app/chat.join'
const DEST_SEND = '/app/chat.send'
const DEST_TYPING = '/app/chat.typing'
const TOPIC_MESSAGES = '/topic/messages'
const TOPIC_PRESENCE = '/topic/presence'
const TOPIC_SYSTEM = '/topic/system'
const TOPIC_TYPING = '/topic/typing'
const QUEUE_ERRORS = '/user/queue/errors'

const RECONNECT_DELAY_MS = 3000
const JOIN_CONFIRM_TIMEOUT_MS = 2500
const JOIN_RETRY_DELAY_MS = 1000
const MAX_JOIN_RETRIES = 3

export interface ChatSocketHandlers {
  // El servidor confirmó que el usuario se unió (primera vez o tras reconectar).
  onJoined: () => void
  // La conexión se perdió después de haberse unido; el cliente reintenta solo.
  onReconnecting: () => void
  onMessage: (message: Message) => void
  onPresence: (event: PresenceEvent) => void
  // Aviso del sistema (alguien se conectó o salió) para mostrarlo en el chat.
  onSystemEvent: (notice: SystemNotice) => void
  // Alguien (también el propio usuario) empezó o dejó de escribir.
  onTyping: (event: TypingEvent) => void
  // No se pudo entrar al chat (nombre en uso, servidor caído...). El cliente no reintenta.
  onJoinFailed: (message: string) => void
  // Error no fatal con la sesión ya iniciada (p. ej. mensaje inválido).
  onError: (message: string) => void
  // No llegó ni confirmación ni error: quien lo use puede verificarlo por REST y llamar a confirmJoined().
  onJoinUnconfirmed: () => void
}

function parse<T>(frame: IMessage): T {
  return JSON.parse(frame.body) as T
}

// Cliente STOMP del chat. No conoce React: solo transporte, protocolo y reconexión.
export class ChatSocket {
  private client: Client | null = null
  private username = ''
  private joined = false
  private hasJoinedOnce = false
  private joinRetries = 0
  private confirmTimer: ReturnType<typeof setTimeout> | undefined
  private retryTimer: ReturnType<typeof setTimeout> | undefined

  constructor(
    private readonly handlers: ChatSocketHandlers,
    private readonly url: string = env.wsUrl,
  ) {}

  connect(username: string): void {
    this.disconnect()
    this.username = username
    const client = new Client({ brokerURL: this.url, reconnectDelay: RECONNECT_DELAY_MS })
    client.onConnect = () => this.handleConnect(client)
    client.onWebSocketClose = () => this.handleClose(client)
    client.onStompError = (frame) => this.fail(client, frame.headers.message ?? 'Error del servidor.')
    this.client = client
    client.activate()
  }

  // false si no hay una sesión unida donde enviar (el llamador conserva el texto).
  send(text: string): boolean {
    if (!this.client?.connected || !this.joined) return false
    this.client.publish({ destination: DEST_SEND, body: JSON.stringify({ content: text }) })
    return true
  }

  // Estado de escritura; false si no hay sesión unida (no es un error: es efímero y se puede perder).
  sendTyping(typing: boolean): boolean {
    if (!this.client?.connected || !this.joined) return false
    const type = typing ? 'USER_TYPING' : 'USER_STOPPED_TYPING'
    this.client.publish({ destination: DEST_TYPING, body: JSON.stringify({ type }) })
    return true
  }

  confirmJoined(): void {
    if (this.joined || !this.client) return
    this.joined = true
    this.hasJoinedOnce = true
    this.joinRetries = 0
    this.clearTimers()
    this.handlers.onJoined()
  }

  disconnect(): void {
    const client = this.client
    this.client = null
    this.joined = false
    this.hasJoinedOnce = false
    this.joinRetries = 0
    this.clearTimers()
    void client?.deactivate()
  }

  private handleConnect(client: Client): void {
    if (client !== this.client) return
    client.subscribe(TOPIC_MESSAGES, (frame) => this.handlers.onMessage(toMessage(parse<ChatMessageDto>(frame))))
    client.subscribe(TOPIC_PRESENCE, (frame) => this.handlePresence(parse<UserSessionDto>(frame)))
    client.subscribe(TOPIC_SYSTEM, (frame) => {
      const notice = toSystemNotice(parse<SystemEventDto>(frame))
      if (notice) this.handlers.onSystemEvent(notice)
    })
    client.subscribe(TOPIC_TYPING, (frame) => {
      const event = toTypingEvent(parse<TypingEventDto>(frame))
      if (event) this.handlers.onTyping(event)
    })
    client.subscribe(QUEUE_ERRORS, (frame) => this.handleServerError(parse<ErrorDto>(frame).message))
    this.joined = false
    this.sendJoin()
  }

  private sendJoin(): void {
    if (!this.client?.connected) return
    this.client.publish({
      destination: DEST_JOIN,
      body: JSON.stringify({ type: 'USER_CONNECTED', username: this.username }),
    })
    clearTimeout(this.confirmTimer)
    this.confirmTimer = setTimeout(() => this.handlers.onJoinUnconfirmed(), JOIN_CONFIRM_TIMEOUT_MS)
  }

  // El backend confirma la unión publicando la presencia del propio usuario.
  private handlePresence(dto: UserSessionDto): void {
    this.handlers.onPresence(toPresenceEvent(dto))
    if (dto.username === this.username && dto.status === 'CONNECTED') this.confirmJoined()
  }

  private handleServerError(message: string): void {
    if (this.joined) {
      this.handlers.onError(message)
      return
    }
    // Tras reconectar, el servidor puede tardar en liberar el nombre de la sesión anterior: reintenta unirse.
    if (this.hasJoinedOnce && this.joinRetries < MAX_JOIN_RETRIES) {
      this.joinRetries += 1
      clearTimeout(this.confirmTimer)
      this.retryTimer = setTimeout(() => this.sendJoin(), JOIN_RETRY_DELAY_MS)
      return
    }
    this.handlers.onJoinFailed(message)
  }

  private handleClose(client: Client): void {
    if (client !== this.client) return
    this.joined = false
    this.clearTimers()
    if (this.hasJoinedOnce) this.handlers.onReconnecting()
    else this.fail(client, 'No se pudo conectar con el servidor.')
  }

  private fail(client: Client, message: string): void {
    if (client !== this.client) return
    if (this.joined) this.handlers.onError(message)
    else this.handlers.onJoinFailed(message)
  }

  private clearTimers(): void {
    clearTimeout(this.confirmTimer)
    clearTimeout(this.retryTimer)
  }
}
