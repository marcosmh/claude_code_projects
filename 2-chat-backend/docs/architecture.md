# Architecture

## Goal

Provide the server side of ChatRoom incrementally. This first stage only delivers the project skeleton so every later feature lands in a predictable place.

## Layers

```
controllers -> services -> repositories
                  |
                mapper      models and dto depend on nothing in the app

config  (beside the layers) -> services, only through interfaces such as UserDetailsService
```

| Layer | Responsibility | Must not |
|---|---|---|
| `controllers` | Expose REST endpoints, validate input (`@Valid`), delegate, return DTOs | hold business logic, touch repositories or entities |
| `services` | Business rules, functional validation, transactions, map entity <-> DTO | know about HTTP |
| `repositories` | `interface X extends JpaRepository<Entity, Id>` | contain logic |
| `models` | JPA entities, domain-only behavior | depend on DTOs, services or web classes |
| `dto` | Java records exposed through the API; never `password` or audit fields (`createdAt`, `updatedAt`) | expose entities |
| `mapper` | One explicit mapper per entity (`toDto`, `toEntity`) | query the database |
| `config` | All Spring and Spring Security configuration: `SecurityConfig` (filter chain, password encoder), CORS, typed `@ConfigurationProperties`, JPA auditing | hold business logic or call repositories; layers do not import it (except properties records) |

Conventions: constructor injection, Jakarta Validation on DTOs, SOLID, comments only for non-obvious reasons. The `@SpringBootApplication` class stays in the root `app` package so scanning covers every sub-package. An optional `exceptions/` package appears with the first vertical (phase 1).

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
| `artifactId` `2-chat-backend`, package `chatbackend` | `artifactId` must equal the folder; Java packages cannot start with a digit |
| One `config/` package for all Spring and Spring Security configuration | Application assembly is readable in one folder; security users come from a `UserDetailsService` in `services/`, so config never touches repositories |
| Spring Security starter not added yet | It locks every endpoint (including Actuator) by default; it arrives in phase 3 together with `SecurityConfig` and the health rule |
| Empty packages with `package-info.java` | Git keeps the structure, nothing compiles that is not needed |

## Roadmap

| Phase | Delivery | Notes |
|---|---|---|
| 0 | Skeleton (this stage) | Builds, starts, `/actuator/health` is UP |
| 1 | First full vertical slice: entity, repository, DTO, mapper, service, controller, `exceptions/` and a `@RestControllerAdvice` returning `ProblemDetail`, tests per layer | Reference pattern for the rest |
| 2 | Messages over REST: model aligned with the frontend (`id`, `sender`, ISO `sentAt`, `text`), list history and send | Replaces the frontend's `getMockMessages` / no-op `sendMessage` |
| 3 | Identity and connection: users and authentication (Spring Security + JWT). Adds the security starter, `config/SecurityConfig`, `config/security/*` (JWT filter and service), `UserDetailsService` in `services/`, health left public | Replaces the mock "connect with a name" |
| 4 | Frontend integration: CORS (`config/CorsConfig` + `app.cors.allowed-origins`), HTTP client inside `useConnection` / `useMessages`, environment variables | Only the hooks' internals change |
| 5 | Real time: WebSocket/STOMP or SSE for new messages | Brokers enter here if needed |
| 6 | Real persistence: PostgreSQL + Flyway, `dev`/`prod` profiles | H2 only for dev and tests |
| 7 | Hardening: observability, integration tests, CI, Docker | |

Out of scope until their phase: brokers, queues, WebSockets, AI/LLM, external services, frontend connection.
