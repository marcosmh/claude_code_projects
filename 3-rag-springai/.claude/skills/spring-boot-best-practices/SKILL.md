---
name: spring-boot-best-practices
description: Generate, maintain and evolve Spring Boot projects (Java 25, Maven, Spring Boot 4.x) with a strict layered architecture - controllers, services, repositories, models, DTO records and explicit mappers. Use this skill whenever the user asks to create a Spring Boot API or project, generate a Spring Boot project from scratch, create or modify entities, repositories, services or controllers, add REST endpoints, refactor a Spring Boot architecture, or build a monolithic Spring MVC / Thymeleaf web app ("spring mvc", "thymeleaf", "spring web monolith"), configure Spring beans, Spring Security, JWT, CORS or application properties (the config package), or build real-time features with WebSocket/STOMP (chat, presence, messaging broker), even if they do not name the skill.
---

# Spring Boot Best Practices

Rules for building Spring Boot code that stays maintainable: each layer has one job, so changes to persistence, business rules or the HTTP contract do not ripple across the codebase.

## 1. Before generating anything

1. **Verify versions.** Check https://spring.io (or https://start.spring.io/actuator/info) for the latest stable Spring Boot. Default to 4.0.6 or newer stable; never use a milestone/RC/snapshot. Java is 25.
2. **Prefer Spring Initializr to hand-writing the build.** It produces a correct `pom.xml` for the chosen Boot version (starter names changed in Boot 4, e.g. the web starter is `spring-boot-starter-webmvc`) and also ships the Maven Wrapper:
   ```bash
   mkdir -p ../scratch && curl -s https://start.spring.io/starter.zip \
     -d type=maven-project -d language=java -d packaging=jar \
     -d bootVersion=<verified-version> -d javaVersion=25 \
     -d groupId=com.markcode.claude.springboot -d artifactId=<artifactId> \
     -d name=<artifactId> -d packageName=com.markcode.claude.springboot.<package-safe-artifactId>.app \
     -d dependencies=web,validation,data-jpa,h2,devtools,actuator \
     -o /tmp/<artifactId>.zip
   ```
   Unzip into the project directory (add `thymeleaf` to `dependencies` for MVC apps). If Initializr is unreachable, write the pom by hand and generate the wrapper with `mvn wrapper:wrapper`; confirm starter artifact names against the Boot docs for that version.
3. **Inspect the existing project first** when modifying one: read the `pom.xml`, base package and an existing entity/service so new code matches its conventions.

## 2. Project baseline

- Maven, `<packaging>jar</packaging>`, Java 25 (`<java.version>25</java.version>`).
- `groupId`: `com.markcode.claude.springboot`.
- `artifactId`: **exactly the name of the current workspace directory** (run `basename "$PWD"`).
- Base package: `com.markcode.claude.springboot.<artifactId>.app`. Java packages cannot contain `-` or start with a digit, so convert the artifactId segment (drop hyphens, use `_`, and drop a leading numeric prefix like `2-` in `2-chat-backend` -> `chatbackend`) and keep the pom's artifactId unchanged. Mention the conversion in the project docs.
- Dependencies, at minimum: Web, Validation, Data JPA, H2, DevTools, Actuator. All must resolve for the selected Boot version.
- Configuration lives in `src/main/resources/application.properties`. Never create `application.yml`/`.yaml`; if Initializr or the user's project has one, convert it.
- The Maven Wrapper (`.mvn/`, `mvnw`, `mvnw.cmd`) must be present. Every build/run/test example uses it, and the default way to run locally is:
  ```bash
  ./mvnw -DskipTests spring-boot:run
  ```
  (tests: `./mvnw test`; package: `./mvnw clean package`). Make `mvnw` executable (`chmod +x mvnw`).

## 3. Layered architecture

Under the base package create one package per responsibility:

```
controllers/   REST endpoints
services/      business logic
repositories/  persistence interfaces
models/        JPA entities
dto/           records exposed through the API
mapper/        one explicit mapper per entity
exceptions/    domain exceptions thrown by services (optional, add when needed)
config/        ALL Spring and Spring Security configuration (@Configuration, @ConfigurationProperties)
```

| Layer | Does | Must not |
|---|---|---|
| Controller | Expose REST endpoints, validate input (`@Valid`), delegate to services, return DTOs | hold business logic, touch repositories or entities |
| Service | Business rules and functional validation, coordinate repositories, map entity <-> DTO through the mapper | know about HTTP types |
| Repository | `interface X extends JpaRepository<Entity, Id>`; derived queries or `@Query` | contain logic |
| Model | JPA entity with domain-only behavior | depend on DTOs, services or web classes |
| Config | `@Configuration` / `@ConfigurationProperties` wiring: security filter chain, password encoder, CORS, JPA auditing, typed properties | hold business logic or call repositories (security users come from a `UserDetailsService` in `services/`) |

The reason for the strict split: a controller that reads a repository couples the HTTP contract to the schema, and entities leaking out of the API expose internals (and lazy-loading surprises). Keep the dependency direction `controller -> service -> repository`. `config/` sits beside the layers: it may depend on `services` (through interfaces such as `UserDetailsService`), and the layers do not import it, apart from typed properties records.

Put every Spring and Spring Security configuration class in `config/` instead of scattering `@Configuration` classes across layers, so how the application is assembled is readable in one place. Create the package (with a `package-info.java`) in every new project even if it starts empty; read `references/config-security.md` before adding security, CORS, properties binding or JPA auditing.

Code conventions: constructor injection only (single constructor, `private final` fields, no `@Autowired` on fields); Jakarta Validation annotations (`@NotBlank`, `@Email`, `@Size`...) on DTO components; apply SOLID; comments only when they explain a non-obvious *why*; follow standard Spring Boot conventions (`@RestController`, `ResponseEntity` or status annotations, `@RequestMapping` base paths like `/api/<resources>`).

### DTOs

Use Java records unless a record does not fit (e.g. a mutable form-backing object in Thymeleaf views, which needs setters).

```java
public record UserDto(Long id, @NotBlank String name, @Email @NotBlank String email) {}
```

- **Never** include `password`, `createdAt`, `updatedAt`, `createAt` or `updateAt` in a DTO - they are sensitive or server-managed, and exposing them lets clients forge or read what they should not.
- Reuse one DTO for request and response when that stays safe and clear (id is ignored on create). Split into `CreateXRequest`/`XResponse` when the shapes diverge or a field is write-only/read-only.

### Mappers

One class per entity (`UserMapper`) in `mapper/`, a Spring `@Component`, with explicit methods:

```java
UserDto toDto(User entity);
User toEntity(UserDto dto);
```

Do not introduce MapStruct, ModelMapper or similar unless the user explicitly asks. Services call mappers; controllers never do.

Read the references when they apply:

- `references/pom-template.md` - reference `pom.xml`, `application.properties` and wrapper notes; when Initializr is unavailable or you need to verify starters.
- `references/project-structure.md` - folder and package tree plus naming and dependency-direction rules.
- `references/config-security.md` - the `config/` package: Spring Security (stateless API and Thymeleaf variants), password encoder, CORS, typed properties, JPA auditing and their tests.
- `references/websocket-stomp.md` - real-time messaging with WebSocket + STOMP (chat, presence, live updates): config, join/send handlers, errors per session, persistence notes, tests and gotchas.
- `references/layer-templates.md` - full entity, repository, mapper, service, controller, error handling and test templates.
- `references/patterns.md` - do/don't list and a review checklist; use it when refactoring or reviewing Spring Boot code.

## 4. Spring MVC + Thymeleaf monoliths

When the user wants a server-rendered web app (not just a REST API), read `references/thymeleaf-web.md` for the template layout (layouts/fragments/pages), semantic HTML and Tailwind CSS setup. The layering rules above still apply: view controllers use `@Controller`, delegate to services, and pass DTOs to the model - never entities or repositories.

## 5. Workflow when creating or changing code

1. Confirm the baseline above exists (or generate it).
2. For each new entity create, in order: model -> repository -> DTO record -> mapper -> service -> controller. Add a global `@RestControllerAdvice` for validation/not-found errors if none exists.
3. When modifying an entity, update its DTO and mapper in the same change and check validation annotations still fit.
4. Anything that is wiring (security rules, CORS, bean definitions, properties binding) goes in `config/`, not in controllers or services. When adding Spring Security, add the starter, the `SecurityConfig` and the Actuator/health rules together, because the starter locks every endpoint by default.
5. Build and verify: `./mvnw -q test` (add at least a slice/service test for new behavior) and, for runnable changes, `./mvnw -DskipTests spring-boot:run` then hit `/actuator/health` and the new endpoint.
6. Report what was generated and anything you could not verify (e.g. network unavailable for version lookup).

## 6. Project documentation

If the project has no `CLAUDE.md`, create one. Make sure it lists `spring-boot-best-practices` under **Available Skills** and its activation rules under **Skill Trigger Rules** (create or modify entities, repositories, services, controllers; add REST endpoints; create a Spring Boot API, project or Spring Web monolith; refactor Spring Boot architecture; phrases like "create spring boot api", "generate spring boot project", "create entity", "add repository", "add service", "add controller", "create endpoint", "spring mvc", "thymeleaf", "modify entity", "modify service", "refactor spring boot", "spring web monolith"). If a `CLAUDE.md` already exists, add the entries to it (or to the README sections it points to) without duplicating them.
