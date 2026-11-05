# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
./mvnw -DskipTests spring-boot:run   # run locally (default way), http://localhost:8080
./mvnw test                          # all tests (needs Docker: PostgreSQL runs in a Testcontainers container)
./mvnw -Dtest=StompMessagingIntegrationTest test   # a single test class (real STOMP clients)
./mvnw clean package                 # build the jar
```

Single test method: `./mvnw -Dtest=ChatMessageServiceTest#methodName test`. Tests sit in mirrored packages under `src/test/java`: `services/` (Mockito), `repositories/` (`@DataJpaTest`), `controllers/` (`@WebMvcTest` for REST) and `StompMessagingIntegrationTest` (`RANDOM_PORT`, real STOMP clients; it waits after subscribing because the simple broker sends no SUBSCRIBE receipts, and joins sequentially because frames from different sessions are not ordered).

Always use the Maven Wrapper, never a global `mvn`. Requires JDK 25.

Manual API collections live in `src/main/resources/postman/postma-api.json` (Postman) and `src/main/resources/rest-cliet/rest_cliet.http` (REST Client / IntelliJ HTTP); update both when a REST endpoint changes. STOMP is not covered by them (see `docs/websocket-api.md`).

## Project

Backend for ChatRoom (frontend in `../1-chat-react`): Spring Boot 4.1.x, Java 25, Maven, Web + WebSocket (STOMP) + Validation + Data JPA + PostgreSQL (Supabase) + DevTools + Actuator. Only `application.properties` is used for configuration (no YAML). It works as a real-time messaging broker (simple in-memory STOMP broker, PostgreSQL persistence): STOMP destinations `/app/chat.join`, `/app/chat.send`, `/topic/messages`, `/topic/presence`, `/topic/system` (connection notices, `SystemEventService`, not persisted), `/app/chat.typing` + `/topic/typing` (typing indicator, `TypingService`, not persisted), `/user/queue/errors`, PostgreSQL persistence and REST `/api/messages`, `/api/users/connected`, `/api/status`. Contract: `docs/websocket-api.md`; decisions and roadmap: `docs/architecture.md`. The React frontend (`../1-chat-react`) is integrated: CORS for `/api/**` (`config/WebConfig`) and WebSocket origins both come from `app.cors.allowed-origins`. Not implemented yet: authentication, external brokers, AI. **Database:** PostgreSQL on Supabase (session pooler, port 5432), configured only through env vars read in `application.properties`: `DB_URL` (JDBC, `?sslmode=require`), `DB_USERNAME`, `DB_PASSWORD`, `DB_SCHEMA` (tables live in the dedicated schema `chat`, not `public`, which Supabase exposes through its REST API and which the project database shares with other apps), optional `DB_POOL_SIZE` and `DDL_AUTO`. Locally copy `.env.example` to `.env` (git-ignored, imported with `spring.config.import`); never put credentials in tracked files. The Hibernate dialect is auto-detected (`PostgreSQLDialect`); `ddl-auto` is `update` by default and `validate` under `SPRING_PROFILES_ACTIVE=prod` (`application-prod.properties`), leaving schema changes to Flyway/Liquibase later. Tables: `chat_message` and `user_session`; the message time column is `sent_at`. Data persists across restarts, so `StartupSessionListener` closes sessions left `CONNECTED` by a previous run. Tests use a disposable PostgreSQL via Testcontainers (`PostgresTestConfiguration`, `@ServiceConnection`), never the configured database. Migration notes: `docs/database-migration.md`. Message content is Unicode-safe: the 500-character limit counts code points (`ChatMessageRequest`), `chat_message.content` is `length = 1000` (a safe margin for UTF-16 units), and nothing filters or normalises the text. `sessionId` is stored in `user_session` but never exposed in DTOs.

Maven `artifactId` is `2-chat-backend` (must equal the folder name); the Java base package is `com.markcode.claude.springboot.chatbackend.app` because a package cannot start with a digit.

## Architecture

Layered, one package per responsibility under the base package: `config`, `controllers` (REST and STOMP entry points), `exceptions`, `services`, `repositories`, `models`, `dto`, `mapper`. Dependency direction `controllers -> services -> repositories`. Controllers never touch repositories or entities; services hold business rules and use explicit mappers; DTOs are records without password/audit fields; constructor injection only. `open-in-view` is disabled. **All Spring and Spring Security configuration lives in `config/`** (wiring only; secrets and CORS origins come from properties/env vars); layers do not import it, and it reaches users only through a `UserDetailsService` in `services/`. The Spring Security starter is not added yet (phase 3): adding it locks every endpoint, so add it together with `SecurityConfig` and the health rule. Details: `.claude/skills/spring-boot-best-practices/references/config-security.md`.

## Available Skills

- `spring-boot-best-practices` (`.claude/skills/spring-boot-best-practices/`): rules and templates for Spring Boot projects with this layered architecture. It is a copy of the skill kept in `../1-chat-react/.claude/skills/`; keep both in sync.

## Skill Trigger Rules

### spring-boot-best-practices

Activate it when the user asks to: configure Spring beans, Spring Security, JWT, CORS or application properties, build WebSocket/STOMP real-time features (see `references/websocket-stomp.md`), create a basic Spring Boot API, create a monolithic Spring Web application, create or modify entities, repositories, services or controllers, add REST endpoints, refactor the Spring Boot architecture, or generate a Spring Boot project from scratch.

It also triggers on phrases such as "create spring boot api", "generate spring boot project", "create entity", "add repository", "add service", "add controller", "create endpoint", "spring mvc", "thymeleaf", "modify entity", "modify service", "refactor spring boot" and "spring web monolith", "spring security", "configure cors", "add config", "websocket", "stomp", "real-time chat".
