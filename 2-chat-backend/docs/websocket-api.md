# Real-time API (STOMP over WebSocket) and REST

Contract for the future frontend integration. There is no authentication yet: a client chooses its `username` when it joins.

## Connection

| Item | Value |
|---|---|
| WebSocket endpoint | `ws://localhost:8080/ws` (plain WebSocket, no SockJS) |
| Allowed origins | `app.cors.allowed-origins` (default `http://localhost:5173`); other origins get `403` |
| Application prefix | `/app` |
| Broker (in memory) | `/topic`, `/queue` |

## Flow

1. Open the STOMP connection to `/ws`.
2. Subscribe to `/topic/messages`, `/topic/presence` and `/user/queue/errors`.
3. Send `/app/chat.join` with the username. A username that is already `CONNECTED` on another session is rejected.
4. Send messages to `/app/chat.send`. The author and the timestamp are set by the server; a session that has not joined gets an error.
5. Closing the connection marks the session `DISCONNECTED` and publishes it on `/topic/presence`.

## Destinations

| Direction | Destination | Payload |
|---|---|---|
| client -> server | `/app/chat.join` | `{"username": "ana"}` (1-24 chars, not blank) |
| client -> server | `/app/chat.send` | `{"content": "hola"}` (1-500 chars, not blank) |
| server -> all | `/topic/messages` | `{"id": 1, "username": "ana", "content": "hola", "timestamp": "2026-10-30T10:30:00Z"}` |
| server -> all | `/topic/presence` | `{"username": "ana", "connectionTime": "2026-10-30T10:29:00Z", "status": "CONNECTED"}` (`CONNECTED` or `DISCONNECTED`) |
| server -> the session | `/user/queue/errors` | `{"message": "El nombre de usuario 'ana' ya está en uso."}` |

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
  client.subscribe('/user/queue/errors', (f) => console.warn(JSON.parse(f.body)))
  client.publish({ destination: '/app/chat.join', body: JSON.stringify({ username: 'ana' }) })
  client.publish({ destination: '/app/chat.send', body: JSON.stringify({ content: 'hola' }) })
}
client.activate()
```

Subscribe before joining so the client does not miss its own presence event.
