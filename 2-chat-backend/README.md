# 2-chat-backend

Backend skeleton for ChatRoom (the React frontend lives in `../1-chat-react`). Spring Boot with a layered architecture.

**Current scope:** a real-time messaging broker. Users connect over WebSocket/STOMP, send messages that are distributed to everyone connected and persisted in H2, and get presence updates; REST exposes the history, the connected users and the status. It is consumed by the React frontend in `../1-chat-react` (start both and open http://localhost:5173). There is no authentication, no external broker and no AI yet. See [docs/architecture.md](docs/architecture.md) for the design and roadmap and [docs/websocket-api.md](docs/websocket-api.md) for the contract.

## Requirements

- JDK 25
- Nothing else: Maven is provided by the wrapper (`./mvnw`).

## Run

```bash
./mvnw -DskipTests spring-boot:run   # http://localhost:8080/actuator/health
./mvnw test
./mvnw clean package
```

## Try it

```bash
./mvnw -DskipTests spring-boot:run
curl localhost:8080/api/status
curl localhost:8080/api/users/connected
curl 'localhost:8080/api/messages?limit=10'
```

- WebSocket endpoint: `ws://localhost:8080/ws` (destinations and payloads in `docs/websocket-api.md`).
- H2 console: `http://localhost:8080/h2-console` (JDBC URL `jdbc:h2:mem:chatdb`, user `sa`, empty password).
- `./mvnw test` includes an integration test that connects real STOMP clients.

## Stack

Java 25, Spring Boot 4.1.2, Maven (jar), Spring Web (MVC), WebSocket (STOMP), Validation, Data JPA, H2 (in memory), DevTools, Actuator. Configuration lives only in `src/main/resources/application.properties`.

## Layout

Base package: `com.markcode.claude.springboot.chatbackend.app`. The Maven `artifactId` is `2-chat-backend` (it must match the folder name) but a Java package cannot start with a digit, so the package uses `chatbackend`.

```
src/main/java/.../chatbackend/app/
├── ChatBackendApplication.java
├── config/         Spring and Spring Security configuration (WebSocket, CORS, properties, Clock)
├── controllers/    REST endpoints and STOMP entry points
├── exceptions/     domain exceptions
├── services/       business logic
├── repositories/   JpaRepository interfaces
├── models/         JPA entities
├── dto/            records exposed by the API
└── mapper/         explicit entity <-> DTO mappers
```

Packages without classes of their own keep a `package-info.java` describing their responsibility.

## Skill

`.claude/skills/spring-boot-best-practices/` is a **copy** of the skill maintained in `../1-chat-react/.claude/skills/`. Keep both in sync when the skill changes.
