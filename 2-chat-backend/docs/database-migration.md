# Migration: H2 (in memory) -> Supabase PostgreSQL

Date: 2026-11-05.

## What changed

| Area | Before | After |
|---|---|---|
| Database | H2 in memory (`jdbc:h2:mem:chatdb`), H2 console | PostgreSQL 17 on Supabase (session pooler, port 5432), schema `chat` |
| Dependencies | `h2`, `spring-boot-h2console` | `org.postgresql:postgresql` (runtime). Tests: `spring-boot-testcontainers`, `testcontainers-junit-jupiter`, `testcontainers-postgresql` |
| Configuration | `spring.datasource.url=jdbc:h2:mem:...` in `application.properties` | `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `DB_SCHEMA` (+ optional `DB_POOL_SIZE`, `DDL_AUTO`) read from the environment or a git-ignored `.env` |
| Schema management | `ddl-auto=update` | `update` by default, `validate` with `SPRING_PROFILES_ACTIVE=prod` |
| Tests | H2 | Disposable PostgreSQL through Testcontainers (needs Docker) |
| Startup | nothing | `StartupSessionListener` closes sessions left `CONNECTED` by a previous run |

Entities, repositories, services, controllers and DTOs did not change functionally. Only `ChatMessage.content` kept `length = 1000` (set earlier for emojis). Hibernate auto-detects `PostgreSQLDialect` (verified in the startup log); setting it explicitly is deprecated in Hibernate 7.

## Decisions worth knowing

- **Dedicated schema `chat`.** The Supabase `postgres` database already holds other applications' tables in `public` (and `e2e`). Putting the chat there would mix data and expose it through Supabase's REST API, so the tables are created in `chat` (`DB_SCHEMA`, created automatically by Hibernate). The existing tables were not touched.
- **No credentials in the repository.** Only `.env.example` (placeholders) is tracked. `.env` is git-ignored.
- **Stale sessions.** A persistent database keeps `CONNECTED` rows when the process dies; they would block usernames forever, so they are closed on startup.
- **Flyway/Liquibase.** Not added yet. `ddl-auto=validate` under `prod` is the bridge; when a migration tool arrives, set `ddl-auto=none`/`validate` everywhere and move the generated DDL into the first migration.

## Data migration (executed)

Source: the H2 database of the running development server (read through its console just before the switch).

| Table | Rows in H2 | Migrated | Notes |
|---|---|---|---|
| `chat_message` | 6 | 6 | ids 1-6 and timestamps preserved; includes the emoji messages (🤩 😱 😏) |
| `user_session` | 3 | 3 | historic sessions, all `DISCONNECTED` (Anakin, Luke, Yoda); ids and timestamps preserved |

Identity sequences were advanced after the explicit ids (`setval` to 6 and 3), so the next message gets id 7. The script refuses to run when the target already has data. Nothing was left out: the H2 database held no `CONNECTED` sessions and no other tables. Rows used to verify the migration (usernames `mig-*`) were removed afterwards; the final counts in Supabase are 6 messages and 3 sessions.

## Verification (against Supabase)

- REST history returns the 6 migrated messages with emojis intact; `/api/status` reports `totalMessages: 6`.
- Three real STOMP clients: join, `USER_CONNECTED` system notices, `USER_TYPING` / `USER_STOPPED_TYPING`, chat messages with emojis (👋😀, 🔥🚀🎉, ZWJ family, flag) persisted and read back identical, disconnect publishing `USER_DISCONNECTED`, connected users list empty afterwards.
- A fake `CONNECTED` row older than the process was closed on restart (`Closed 1 stale user session(s)`).
- `./mvnw test`: 38 tests pass on a PostgreSQL container, including 500-emoji round trip and the 500/501 character limit.

## Running

```bash
cp .env.example .env     # fill in DB_URL, DB_USERNAME, DB_PASSWORD, DB_SCHEMA
./mvnw -DskipTests spring-boot:run
```

The Supabase password was pasted in a chat while doing this migration: rotate it (Project Settings > Database) and update `.env`.
