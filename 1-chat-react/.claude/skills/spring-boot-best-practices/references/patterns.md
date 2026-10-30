# Patterns and anti-patterns

Use when writing or reviewing Spring Boot code. Each item says why, because the rule only helps if you can judge edge cases.

## Contents
- Do
- Don't
- Review checklist

## Do

- **Constructor injection with `private final` fields.** Dependencies are explicit, immutable and trivial to mock; no reflection needed in tests.
- **Return DTOs from controllers, never entities.** Entities carry lazy collections and internal fields; serializing them leaks the schema and triggers `LazyInitializationException`.
- **Put `@Transactional` on service methods**, `readOnly = true` for queries. The service is the unit of work; a controller-level transaction hides business boundaries.
- **Validate at the edge, enforce rules in the service.** `@Valid` + Jakarta annotations check shape (not blank, email format); the service checks rules that need data (email already registered).
- **Throw domain exceptions from services** and translate them once in a `@RestControllerAdvice` returning `ProblemDetail`. Clients get one consistent error shape.
- **Use `Optional` from repositories** and convert absence to a not-found exception in the service.
- **Paginate collections** (`Pageable`, `Page<T>`) as soon as a list can grow; map with `page.map(mapper::toDto)`.
- **Use `ResponseEntity.created(location)` for POST** and 204 for deletes; keep status codes meaningful.
- **Externalize configuration** in `application.properties` or `@ConfigurationProperties` records instead of `@Value` scattered through classes.
- **Make mappers null-safe where input can be null**, and keep them free of repository calls. A mapper that queries the database is a hidden service.
- **Update by loading, then changing, then saving** (`findById` -> apply DTO fields -> `save`) so `createdAt` and other server-managed fields are not overwritten by a blind `toEntity`.

- **Keep all Spring and Spring Security configuration in `config/`**, wiring only, so the application assembly is readable in one folder.
- **Bind settings with a `@ConfigurationProperties` record** and keep secrets in environment variables.

## Don't

- Inject a repository into a controller, or return `Optional`/entities from one.
- Put `if` business rules in controllers or mappers.
- Use field injection (`@Autowired` on fields) or static helpers that fetch beans.
- Expose `password`, `createdAt`, `updatedAt`, `createAt`, `updateAt` in a DTO.
- Use `application.yml`, MapStruct/ModelMapper (unless asked), or `FetchType.EAGER` as a fix for lazy-loading errors.
- Catch `Exception` broadly in services just to log and continue.
- Return `null` for "not found" or build SQL by string concatenation (use derived queries or `@Query` with named parameters).
- Use `spring.jpa.hibernate.ddl-auto=create-drop` anywhere except throwaway demos with H2.
- Scatter `@Configuration` classes across layers, hard-code secrets or CORS origins, or disable CSRF on a session/cookie-based UI.
- Add comments that restate the code; comment only the non-obvious why.

## Review checklist

1. Packages and dependency direction match `project-structure.md`.
2. Every controller method takes/returns DTOs and `@Valid` on request bodies.
3. No repository or entity reference in `controllers/`.
4. DTOs are records and omit sensitive/audit fields.
5. One explicit mapper per entity; no mapping library.
6. Services own `@Transactional` and business rules.
7. Errors flow through the advice class.
8. Build is `./mvnw`-based and `application.properties` is the only config file.
9. Spring/Security configuration lives only in `config/`; no secrets or origins hard-coded.
10. Tests exist for new service behavior and each new endpoint.
