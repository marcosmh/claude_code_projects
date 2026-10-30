# 2-chat-backend

Backend skeleton for ChatRoom (the React frontend lives in `../1-chat-react`). Spring Boot with a layered architecture.

**Current scope: structure only.** There is no business logic, no functional endpoints, no broker/WebSocket/AI integration and no connection to the frontend yet. See [docs/architecture.md](docs/architecture.md) for the architecture, initial decisions and the phased roadmap.

## Requirements

- JDK 25
- Nothing else: Maven is provided by the wrapper (`./mvnw`).

## Run

```bash
./mvnw -DskipTests spring-boot:run   # http://localhost:8080/actuator/health
./mvnw test
./mvnw clean package
```

## Stack

Java 25, Spring Boot 4.1.2, Maven (jar), Spring Web (MVC), Validation, Data JPA, H2 (in memory), DevTools, Actuator. Configuration lives only in `src/main/resources/application.properties`.

## Layout

Base package: `com.markcode.claude.springboot.chatbackend.app`. The Maven `artifactId` is `2-chat-backend` (it must match the folder name) but a Java package cannot start with a digit, so the package uses `chatbackend`.

```
src/main/java/.../chatbackend/app/
├── ChatBackendApplication.java
├── config/         Spring and Spring Security configuration
├── controllers/    REST endpoints
├── services/       business logic
├── repositories/   JpaRepository interfaces
├── models/         JPA entities
├── dto/            records exposed by the API
└── mapper/         explicit entity <-> DTO mappers
```

The packages are empty on purpose; each one has a `package-info.java` describing its responsibility.

## Skill

`.claude/skills/spring-boot-best-practices/` is a **copy** of the skill maintained in `../1-chat-react/.claude/skills/`. Keep both in sync when the skill changes.
