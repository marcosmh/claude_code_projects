# Real-time messaging with WebSocket + STOMP

Pattern verified in a working project (Spring Boot 4.1, Java 25): an in-memory STOMP broker that receives messages from clients, persists them with JPA and distributes them to everyone connected. Use it when the user asks for chat, live updates, presence or any server-push feature. The layering rules in `SKILL.md` still apply; this file only adds what is specific to STOMP.

## Contents
- Dependencies
- Where each piece lives
- Configuration
- Identity without authentication
- Controllers (STOMP entry points)
- Presence and session lifecycle
- Error handling
- Persistence notes
- REST companion endpoints
- Tests
- Gotchas
- Later phases

## Dependencies

Boot 4 starters: `spring-boot-starter-websocket` and, in test scope, `spring-boot-starter-websocket-test`. The H2 console needs `spring-boot-h2console` (already in the baseline). Confirm names against the Boot version in use.

## Where each piece lives

| Piece | Package |
|---|---|
| `WebSocketConfig` (endpoint, broker, prefixes), `AppProperties`, `ClockConfig` | `config/` |
| `@MessageMapping` handlers, session event listener, REST controllers | `controllers/` (STOMP handlers are entry points like REST controllers: no business logic) |
| Join/leave rules, "must have joined to send", persistence, history limits | `services/` |
| `ChatMessage`, `UserSession`, `ConnectionStatus` | `models/` |
| `JoinRequest`, `ChatMessageRequest`, `ChatMessageDto`, `UserSessionDto`, `ErrorDto` (records) | `dto/` |
| Explicit mappers, one per entity | `mapper/` |
| `BusinessRuleException` | `exceptions/` |

The `ConnectionStatus` enum is a shared value type that DTOs may reuse; entities stay out of DTOs.

## Configuration

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final AppProperties properties;
    public WebSocketConfig(AppProperties properties) { this.properties = properties; }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(properties.cors().allowedOrigins().toArray(String[]::new));
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");     // swap for an external relay later
        registry.setApplicationDestinationPrefixes("/app");
    }
}
```

- Allowed origins come from `app.cors.allowed-origins` (typed `AppProperties` record, enabled with `@ConfigurationPropertiesScan` on the application class). Never use `*` casually: browsers enforce the origin check only if the server does, and a wrong origin must get `403`.
- Plain WebSocket (no SockJS) unless the user needs legacy fallbacks.
- Bean-validation on payloads works out of the box when `spring-boot-starter-validation` is present.
- Inject a `Clock` bean so server-side timestamps are testable.

## Identity without authentication

Before security exists, let the client say who it is with an explicit join message; Spring supplies the session id.

- `/app/chat.join {username}` -> service registers a `UserSession(username, sessionId, connectionTime, CONNECTED)`; reject a username that is already `CONNECTED` on another session and a second join on the same session.
- `/app/chat.send {content}` -> service resolves the author **from the session**, never from the payload; reject if the session has not joined. The server sets the timestamp.
- Do not expose `sessionId` in DTOs.

When Spring Security/JWT arrives (see `config-security.md`), the username comes from the `Principal` and the join step shrinks to a presence announcement.

## Controllers (STOMP entry points)

```java
@Controller
public class ChatWebSocketController {
    // constructor: UserSessionService, ChatMessageService, SimpMessagingTemplate

    @MessageMapping("/chat.join")
    @SendTo("/topic/presence")
    public UserSessionDto join(@Valid @Payload JoinRequest request, SimpMessageHeaderAccessor headers) {
        return userSessions.join(headers.getSessionId(), request.username());
    }

    @MessageMapping("/chat.send")
    @SendTo("/topic/messages")
    public ChatMessageDto send(@Valid @Payload ChatMessageRequest request, SimpMessageHeaderAccessor headers) {
        return messages.send(headers.getSessionId(), request);
    }
}
```

Handlers delegate and return DTOs; `@SendTo` publishes the return value to every subscriber. Destination naming: `/app/*` inbound, `/topic/*` broadcast, `/user/queue/*` per-session.

## Presence and session lifecycle

```java
@Component
public class WebSocketEventListener {
    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        userSessions.disconnect(event.getSessionId())
                .ifPresent(session -> messaging.convertAndSend("/topic/presence", session));
    }
}
```

`disconnect` returns an `Optional` (empty for sessions that never joined or were already closed) so the listener publishes only real changes. Keep `connect/disconnect` state changes in the service (`UserSession.disconnect()` is domain logic on the entity).

## Error handling

Send errors only to the offending session, as a DTO, instead of letting the frame fail silently:

```java
@MessageExceptionHandler(BusinessRuleException.class)
public void handleBusinessRule(BusinessRuleException ex, SimpMessageHeaderAccessor headers) {
    replyError(headers.getSessionId(), ex.getMessage());
}

@MessageExceptionHandler(org.springframework.messaging.handler.annotation.support.MethodArgumentNotValidException.class)
public void handleInvalid(... ex, SimpMessageHeaderAccessor headers) { /* first binding error -> replyError */ }

private void replyError(String sessionId, String message) {
    SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.create(SimpMessageType.MESSAGE);
    accessor.setSessionId(sessionId);
    accessor.setLeaveMutable(true);
    messaging.convertAndSendToUser(sessionId, "/queue/errors", new ErrorDto(message), accessor.getMessageHeaders());
}
```

Without a `Principal`, address the user destination by session id as above; clients subscribe to `/user/queue/errors`. The messaging `MethodArgumentNotValidException` is a different class from the web one; REST keeps its own `@RestControllerAdvice`.

## Persistence notes

- Name the message time column explicitly: `timestamp` is reserved in H2, so use `@Column(name = "sent_at")` on a field called `timestamp`.
- History: a repository method `findAllByOrderByIdDesc(Pageable)` plus reversing in the service gives "latest N, oldest first". Clamp the requested limit with properties (`app.history.default-limit`, `app.history.max-limit`).
- Persist presence (`UserSession`) too if REST must list connected users; index/unique on `sessionId`.
- H2 console (`spring.h2.console.enabled=true`) is for development only; turn it off or protect it outside dev. Document the JDBC URL (`jdbc:h2:mem:<name>`).

## REST companion endpoints

Typically `GET /api/messages?limit=`, `GET /api/users/connected`, `GET /api/status` (`status`, `connectedUsers`, `totalMessages`, `serverTime`) next to `/actuator/health`. They are ordinary controllers -> services -> mappers and share the same DTOs as the STOMP payloads.

## Tests

- **Services:** Mockito with a fixed `Clock`; cover duplicate username, second join, send-without-join, history clamping and order.
- **Repositories:** `@DataJpaTest` (Boot 4 package `org.springframework.boot.data.jpa.test.autoconfigure`).
- **REST controllers:** `@WebMvcTest` (`org.springframework.boot.webmvc.test.autoconfigure`) with `@MockitoBean` (`org.springframework.test.context.bean.override.mockito`); assert `sessionId` is absent from JSON.
- **End to end:** `@SpringBootTest(webEnvironment = RANDOM_PORT)` with `@LocalServerPort` (`org.springframework.boot.test.web.server`), `WebSocketStompClient(new StandardWebSocketClient())` and `new JacksonJsonMessageConverter()` (Jackson 3 in Boot 4). Scenarios: A sends and B receives and the message is persisted; duplicate username only errors the offender; send without join errors; closing a session publishes `DISCONNECTED`. Use unique usernames per test because the context and H2 are shared.

## Gotchas

- The simple broker sends no RECEIPT for SUBSCRIBE, so `setAutoReceipt` waits forever; sleep briefly (e.g. 300 ms) after subscribing in tests before sending.
- Subscribe before joining so a client sees its own presence event.
- `@WebMvcTest` slices do not load `@Configuration` classes, but services must be mocked because the controllers need them.
- Timestamps serialize as ISO-8601 instants with Jackson 3; assert on the string in REST tests.

## Later phases

External broker relay (`enableStompBrokerRelay` for RabbitMQ/ActiveMQ) replaces only `configureMessageBroker`; authentication moves identity to the `Principal` (channel interceptor in `config/security/`); rooms and private chat add destinations (`/topic/rooms/{id}`, `/user/queue/private`) and a service rule for membership.
