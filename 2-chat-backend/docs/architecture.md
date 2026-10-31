# Architecture

## Goal

Provide the server side of ChatRoom incrementally. Current state: a real-time messaging broker over WebSocket/STOMP with H2 persistence and a small REST API (contract in [websocket-api.md](websocket-api.md)). It is consumed by the React frontend in `../1-chat-react`. There is still no authentication and no external broker.

## Layers

```
controllers -> services -> repositories
                  |
                mapper      models and dto depend on nothing in the app
                            (dto may reuse the ConnectionStatus enum from models)

config  (beside the layers) -> services, only through interfaces such as UserDetailsService
```

| Layer | Responsibility | Must not |
|---|---|---|
| `controllers` | Expose REST endpoints and STOMP entry points (`@MessageMapping`, session lifecycle events), validate input (`@Valid`), delegate, return DTOs | hold business logic, touch repositories or entities |
| `services` | Business rules, functional validation, transactions, map entity <-> DTO | know about HTTP |
| `repositories` | `interface X extends JpaRepository<Entity, Id>` | contain logic |
| `models` | JPA entities, domain-only behavior | depend on DTOs, services or web classes |
| `dto` | Java records exposed through the API; never `password` or audit fields (`createdAt`, `updatedAt`) | expose entities |
| `mapper` | One explicit mapper per entity (`toDto`, `toEntity`) | query the database |
| `config` | All Spring and Spring Security configuration: `SecurityConfig` (filter chain, password encoder), CORS, typed `@ConfigurationProperties`, JPA auditing | hold business logic or call repositories; layers do not import it (except properties records) |

Conventions: constructor injection, Jakarta Validation on DTOs, SOLID, comments only for non-obvious reasons. The `@SpringBootApplication` class stays in the root `app` package so scanning covers every sub-package. `exceptions/` holds domain exceptions; they are translated at the edges (`ApiExceptionHandler` for REST, `@MessageExceptionHandler` for STOMP).

## Real-time messaging design

- **Domain:** `ChatMessage` (id, username, content, timestamp) and `UserSession` (username, sessionId, connectionTime, status CONNECTED/DISCONNECTED), both in H2.
- **Identity without auth:** the client sends `/app/chat.join {username}`; the session id comes from Spring. A username already connected on another session is rejected. With JWT (phase 3) the username will come from the `Principal`.
- **Flow:** `ChatWebSocketController` -> `UserSessionService` / `ChatMessageService` (rules, persistence through repositories, explicit mappers) -> result published with `@SendTo` to `/topic/messages` or `/topic/presence`. Disconnection is handled by `WebSocketEventListener`.
- **Server-side time:** author and timestamp are never taken from the client; a `Clock` bean (`config/ClockConfig`) makes this testable.
- **Errors:** sent only to the offending session on `/user/queue/errors`, addressed by session id.
- **Broker:** Spring's in-memory simple broker, configured in one place (`config/WebSocketConfig`); an external broker replaces that one configuration later.

## Initial decisions

| Decision | Why |
|---|---|
| Java 25, Spring Boot 4.1.2 (latest stable at creation; minimum 4.0.6) | Current LTS Java and a supported Boot line. Verify the version on spring.io before upgrades |
| Maven + Maven Wrapper | Reproducible builds with no local Maven requirement; always run `./mvnw` |
| `application.properties` only | One configuration format across the project, no YAML |
| H2 in memory | Zero-setup persistence for development and tests; replaced in phase 6 |
| `spring.jpa.open-in-view=false` | Forces data to be loaded in services and keeps entities out of controllers |
| Records for DTOs, explicit mappers, no MapStruct | Immutable API contracts and no hidden mapping magic |
| Actuator exposes only `health,info` | Minimal surface while there is no security |
| WebSocket + STOMP with the simple in-memory broker | Standard Spring support, no extra infrastructure; scaling out needs an external broker (later phase) |
| Plain WebSocket, no SockJS | Modern browsers support it; fewer moving parts |
| One `app.cors.allowed-origins` property for REST and WebSocket | A single place to change allowed origins (later per profile) |
| Session ids stay out of DTOs | They identify live connections and are not needed by clients |
| H2 console enabled | Development convenience only; must be disabled/secured outside dev |
| `artifactId` `2-chat-backend`, package `chatbackend` | `artifactId` must equal the folder; Java packages cannot start with a digit |
| One `config/` package for all Spring and Spring Security configuration | Application assembly is readable in one folder; security users come from a `UserDetailsService` in `services/`, so config never touches repositories |
| Spring Security starter not added yet | It locks every endpoint (including Actuator) by default; it arrives in phase 3 together with `SecurityConfig` and the health rule |
| Empty packages with `package-info.java` | Git keeps the structure, nothing compiles that is not needed |

## Roadmap

| Phase | Delivery | Notes |
|---|---|---|
| 0 | Skeleton (this stage) | Builds, starts, `/actuator/health` is UP |
| 1 | First full vertical slice (done as part of phase 2): entity, repository, DTO, mapper, service, controller, `exceptions/`, tests per layer | Reference pattern for the rest |
| 2 | Messaging core (done): STOMP join/send/presence, H2 persistence, history and status over REST | Contract in `websocket-api.md`; maps onto the frontend `Message` |
| 3 | Identity and connection: users and authentication (Spring Security + JWT). Adds the security starter, `config/SecurityConfig`, `config/security/*` (JWT filter and service), `UserDetailsService` in `services/`, health left public | Replaces the mock "connect with a name" |
| 4 | Frontend integration (done): REST CORS in `config/WebConfig` and WebSocket origins from `app.cors.allowed-origins`; the frontend uses `services/` (REST + STOMP client) behind `useChat` with env-based URLs | Reconnection and history reload on the client side |
| 5 | Scale and resilience: external broker relay (RabbitMQ/ActiveMQ), reconnection handling, rooms/private chat if wanted | Replaces the simple broker in `WebSocketConfig` |
| 6 | Real persistence: PostgreSQL + Flyway, `dev`/`prod` profiles | H2 only for dev and tests |
| 7 | Hardening: observability, integration tests, CI, Docker | |

Out of scope until their phase: authentication/JWT/roles, external brokers, AI/LLM, external databases, distributed scaling, private chats/groups.
