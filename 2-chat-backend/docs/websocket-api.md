# Real-time API (STOMP over WebSocket) and REST

Contract used by the React frontend (`../1-chat-react`: `src/services/chatSocket.ts` and `chatApi.ts`). There is no authentication yet: a client chooses its `username` when it joins.

## Connection

| Item | Value |
|---|---|
| WebSocket endpoint | `ws://localhost:8080/ws` (plain WebSocket, no SockJS) |
| Allowed origins | `app.cors.allowed-origins` (default `http://localhost:5173`); other origins get `403`. The same property drives CORS for `/api/**` (GET, OPTIONS) in `config/WebConfig` and the WebSocket origins in `config/WebSocketConfig` |
| Application prefix | `/app` |
| Broker (in memory) | `/topic`, `/queue` |

## Flow

1. Open the STOMP connection to `/ws`.
2. Subscribe to `/topic/messages`, `/topic/presence`, `/topic/system`, `/topic/typing` and `/user/queue/errors`.
3. Send `/app/chat.join` with the `USER_CONNECTED` event and the username. A username that is already `CONNECTED` on another session is rejected.
4. Send messages to `/app/chat.send`. The author and the timestamp are set by the server; a session that has not joined gets an error.
5. While a user types, the client sends `/app/chat.typing` with `USER_TYPING` (and `USER_STOPPED_TYPING` when it stops or sends the message). The server adds the author from the session and relays it on `/topic/typing`.
6. A successful join publishes the presence on `/topic/presence` and a `USER_CONNECTED` system event on `/topic/system`. Closing the connection marks the session `DISCONNECTED` and publishes the presence plus a `USER_DISCONNECTED` system event.

## Destinations

| Direction | Destination | Payload |
|---|---|---|
| client -> server | `/app/chat.join` | `{"type": "USER_CONNECTED", "username": "ana"}` (username 1-24 chars, not blank; `type` is optional but, when sent, must be `USER_CONNECTED`) |
| client -> server | `/app/chat.send` | `{"content": "hola"}` (1-500 chars, not blank) |
| server -> all | `/topic/messages` | `{"id": 1, "username": "ana", "content": "hola", "timestamp": "2026-10-30T10:30:00Z"}` |
| server -> all | `/topic/presence` | `{"username": "ana", "connectionTime": "2026-10-30T10:29:00Z", "status": "CONNECTED"}` (`CONNECTED` or `DISCONNECTED`) |
| server -> all | `/topic/system` | `{"type": "USER_CONNECTED", "username": "Luke", "content": "Luke se ha conectado al chat.", "timestamp": "2026-10-30T10:29:00Z"}` (`type` is `USER_CONNECTED` or `USER_DISCONNECTED`) |
| client -> server | `/app/chat.typing` | `{"type": "USER_TYPING"}` or `{"type": "USER_STOPPED_TYPING"}` (anything else is rejected; the session must have joined) |
| server -> all | `/topic/typing` | `{"type": "USER_TYPING", "username": "Anakin", "timestamp": "2026-10-30T10:29:00Z"}` (also sent to the author: clients ignore their own) |
| server -> the session | `/user/queue/errors` | `{"message": "El nombre de usuario 'ana' ya está en uso."}` |

`MessageType` is `CHAT`, `USER_CONNECTED` or `USER_DISCONNECTED`. `CHAT` is reserved for user messages (`/topic/messages`); system events travel on their own topic, are not persisted and never appear in `GET /api/messages`. `/topic/presence` keeps the state (who is online); `/topic/system` carries the notices to display. Future events (rooms, private messages) get their own destination and a new `MessageType` value.

Typing events are ephemeral: they are relayed only, never persisted, and handled by `TypingService` apart from messages and presence. The React client sends one `USER_TYPING` when the user starts typing, refreshes it at most every 3 s while typing continues, and sends `USER_STOPPED_TYPING` after 2.5 s without typing, with empty text or on send. Because a stop event can be lost, receivers also expire a typing user after 6 s without a refresh and clear the user on a new message, on leaving or on reconnecting.

Timestamps are UTC ISO-8601 instants. The message shape (`id`, author, text, ISO time) maps onto the frontend's `Message` (`sender` <- `username`, `text` <- `content`, `sentAt` <- `timestamp`).

## REST

| Endpoint | Description |
|---|---|
| `GET /api/messages?limit=50` | Latest messages, oldest first. `limit` defaults to `app.history.default-limit` (50) and is capped by `app.history.max-limit` (200) |
| `GET /api/users/connected` | Users currently `CONNECTED` (no session ids exposed) |
| `GET /api/status` | `{"status":"UP","connectedUsers":0,"totalMessages":0,"serverTime":"..."}` |
| `GET /actuator/health` | Spring Boot Actuator health |

Business rule violations on REST return `409` as `ProblemDetail`.

## Development tools

- H2 console: `http://localhost:8080/h2-console`, JDBC URL `jdbc:h2:mem:chatdb`, user `sa`, empty password. Tables: `chat_message`, `user_session`. Data is lost on restart.

## Example (JavaScript, `@stomp/stompjs`)

```js
const client = new Client({ brokerURL: 'ws://localhost:8080/ws' })
client.onConnect = () => {
  client.subscribe('/topic/messages', (f) => console.log(JSON.parse(f.body)))
  client.subscribe('/topic/presence', (f) => console.log(JSON.parse(f.body)))
  client.subscribe('/topic/typing', (f) => console.log(JSON.parse(f.body)))
  client.subscribe('/topic/system', (f) => console.log(JSON.parse(f.body).content))
  client.subscribe('/user/queue/errors', (f) => console.warn(JSON.parse(f.body)))
  client.publish({ destination: '/app/chat.join', body: JSON.stringify({ type: 'USER_CONNECTED', username: 'ana' }) })
  client.publish({ destination: '/app/chat.send', body: JSON.stringify({ content: 'hola' }) })
}
client.activate()
```

Subscribe before joining so the client does not miss its own presence event. Frames of one session are not strictly ordered on the server, so a client should not wait forever for that event: the React client verifies with `GET /api/users/connected` when no confirmation arrives within 2.5 s.
