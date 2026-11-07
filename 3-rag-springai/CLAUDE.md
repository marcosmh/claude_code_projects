# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visión general

Backend RAG (Retrieval-Augmented Generation): se suben PDFs, se indexan como vectores en PostgreSQL + pgvector y se responden preguntas con un LLM local (Ollama) usando **solo** el contexto recuperado.

- Aplicación: **rag-springai** (`artifactId` `3-rag-springai`, `groupId` `com.markcode`, paquete base `com.markcode.rag`, clase principal `RagSpringAiApplication`).
- Java 25 (`<java.version>`), Spring Boot **4.1.2** (última estable compatible con Java 25), Spring AI **2.0.2** (BOM), springdoc 3.2.x, Lombok. Base de datos: `spring_ia_rag`.
- Modelos Ollama: LLM `qwen3:4b`, embeddings `nomic-embed-text` (**768 dimensiones**; deben coincidir con `spring.ai.vectorstore.pgvector.dimensions`).

## Comandos

```bash
docker compose up -d postgres                         # solo PostgreSQL+pgvector (host 5434); Ollama NO está en el compose
./mvnw -DskipTests spring-boot:run                    # API en :8080 (por defecto descarga los modelos si faltan; la 1ª vez tarda)
./mvnw test                                           # unitarias + WebMvc (Surefire)
./mvnw verify                                         # + integración *IT (Failsafe, requiere Docker para Testcontainers)
./mvnw test -Dtest=RagServiceTest#cleanFallsBackWhenModelReturnsOnlyThinking   # un solo test
./mvnw verify -Dit.test=RagFlowIT -DskipTests=false   # solo la integración
./mvnw clean package
```

Swagger UI: `http://localhost:8080/swagger-ui.html`. Colección Postman (`src/main/resources/postman/postman-api.json`) y HTTP Client (`src/main/resources/rest-client/rest-client.http`): **mantener ambos sincronizados** al añadir/cambiar endpoints. Ejemplos:

```bash
curl -F "file=@doc.pdf" localhost:8080/api/documents/upload
curl -H 'Content-Type: application/json' -d '{"question":"¿Cuál es la política de vacaciones?"}' localhost:8080/api/rag/ask
```

## Estructura

```
src/main/java/com/markcode/rag
├── RagSpringAiApplication.java
├── config/       AiConfig (ChatClient, TextSplitter, @EnableConfigurationProperties), RagProperties (app.rag.*)
├── controller/   DocumentController (POST /api/documents/upload), RagController (POST /api/rag/ask)
├── service/      DocumentIngestionService, RagService
├── repository/   DocumentRepository (JPA, tabla documents), VectorStoreRepository (envuelve VectorStore/pgvector)
├── model/        DocumentMetadata (entidad JPA)
├── dto/          AskRequest, AskResponse, SourceDto, DocumentResponse (records)
├── mapper/       DocumentMapper
└── exception/    InvalidDocumentException, DocumentProcessingException, GlobalExceptionHandler (ProblemDetail)
src/test/java/com/markcode/rag
├── service/ controller/ PdfFixtures   # Mockito + @WebMvcTest; PdfFixtures genera PDFs con PDFBox
└── integration/RagFlowIT              # upload -> ask contra pgvector real (Testcontainers)
```

## Arquitectura (lo que requiere leer varios archivos)

Capas estrictas `controller -> service -> repository`; los controllers solo validan y delegan, los services mapean entidad↔DTO vía mapper, y la configuración Spring va en `config/`.

- **No hay `EmbeddingService` ni `PgVectorConfig`**: el `EmbeddingModel` (Ollama) y el `PgVectorStore` los autoconfigura Spring AI desde `application.properties`; `VectorStore.add/similaritySearch` generan los embeddings internamente. Para cambiar de modelo/fuente de vectores basta con propiedades o un bean `VectorStore`/`EmbeddingModel`. Fuera de `config/` solo depender de abstracciones de Spring AI, no de clases de Ollama.
- **Ingesta** (`DocumentIngestionService`): valida firma `%PDF-` → cuenta páginas con PDFBox → `PagePdfDocumentReader` (una `Document` por página) → normaliza el texto y añade metadatos (`documentId`, `fileName`, `page`, `uploadedAt`) → `TokenTextSplitter` (`app.rag.chunk-size`, copia metadatos a cada chunk) → `VectorStoreRepository.saveAll` → guarda `DocumentMetadata` en la tabla `documents`. El vector store y JPA no comparten transacción: si falla el guardado de metadatos se hace un borrado compensatorio de los vectores por `documentId`.
- **Consulta** (`RagService`): `similaritySearch` (top-K + umbral, distancia coseno) → si no hay fragmentos responde un mensaje fijo **sin llamar al LLM** → si hay, arma prompt (system: asistente legal —litigios/arbitraje— que responde solo con el contexto y devuelve Categoría/Resumen/Análisis/Estrategia sugerida/Nivel de confianza/Fuentes, ver `SYSTEM_PROMPT`; user: contexto + pregunta + `/no_think`) → `ChatClient` → se eliminan los bloques `<think>…</think>` de qwen3 → `AskResponse(answer, sources[])`. El contexto va en el mensaje de usuario (no en el system) para que llaves `{}` del PDF no se interpreten como plantilla; hay un test que lo cubre (`RagFlowIT`).
- Errores: `GlobalExceptionHandler` devuelve `ProblemDetail` (400 validación/PDF inválido, 413 tamaño, 503 Ollama inaccesible vía `RestClientException`, 500 resto).
- Logging estructurado: `logging.structured.format.console` (logstash por defecto, `LOG_STRUCTURED_FORMAT=ecs` para cambiar) + `log.atInfo().addKeyValue(...)`.

## Configuración

Todo en `src/main/resources/application.properties` (nunca `application.yml`), con variables de entorno y defaults `${VAR:default}`; ver `.env.example`. Claves principales:

```properties
spring.datasource.url=jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5434}/${DB_NAME:spring_ia_rag}
spring.ai.ollama.base-url=${OLLAMA_BASE_URL:http://localhost:11434}
spring.ai.ollama.chat.options.model=${OLLAMA_CHAT_MODEL:qwen3:4b}
spring.ai.ollama.embedding.options.model=${OLLAMA_EMBEDDING_MODEL:nomic-embed-text}
spring.ai.ollama.init.pull-model-strategy=${OLLAMA_PULL_STRATEGY:when_missing}   # la app no arranca sin Ollama; usar "never" si no hace falta
spring.ai.vectorstore.pgvector.initialize-schema=true    # crea extensión vector + tabla vector_store
spring.ai.vectorstore.pgvector.index-type=HNSW
spring.ai.vectorstore.pgvector.distance-type=COSINE_DISTANCE
spring.ai.vectorstore.pgvector.dimensions=768
app.rag.chunk-size=${RAG_CHUNK_SIZE:800}   # tokens; app.rag.top-k, app.rag.similarity-threshold
spring.jpa.hibernate.ddl-auto=${JPA_DDL_AUTO:update}     # crea la tabla documents (no hay Flyway)
```

## Gotchas del entorno

- **Ollama es el instalado en el WSL (Debian 13)**, en `localhost:11434`, con `qwen3:4b` y `nomic-embed-text` ya descargados; no se usa Ollama en Docker. Verificado end-to-end (upload + ask) contra él.
- **Puerto 5432 ocupado**: el WSL tiene un PostgreSQL 17 nativo en 5432 y el puerto 5433 lo usa otro contenedor, por eso `rag-postgres` publica en **5434** (`DB_PORT`). Docker Compose lee `.env` (con `DB_PORT` posiblemente distinto): si `docker compose config` muestra otro puerto publicado, ajustar `DB_PORT` en `.env` o lanzar `DB_PORT=5434 docker compose up -d postgres` y la app con `DB_PORT=5434`.

- JDK 23+ desactiva el procesamiento de anotaciones por defecto: el `pom.xml` fija `<proc>full</proc>` y `lombok.version` 1.18.48; no quitarlos o Lombok deja de generar código.
- Boot 4 / Spring AI 2: starter web = `spring-boot-starter-webmvc`; Jackson 3 (`tools.jackson.*`); Testcontainers 2 (`testcontainers-junit-jupiter`, `org.testcontainers.postgresql.PostgreSQLContainer` no genérico); en tests `@WebMvcTest` vive en `org.springframework.boot.webmvc.test.autoconfigure` y `TestRestTemplate` requiere `spring-boot-resttestclient` + `@AutoConfigureTestRestTemplate`.
- Tras cambiar versiones/imports usar `./mvnw clean ...`: la compilación incremental dejó clases de test obsoletas que ocultaban errores.
- Los tests de integración usan `pgvector/pgvector:pg17` y sustituyen Ollama por un `EmbeddingModel` determinista (hashing, 768 dims) y un `ChatModel` mock (con `getOptions()` stubbeado, necesario en Spring AI 2); no requieren Ollama. Ponen `pull-model-strategy=never`.
- Spring Initializr se usó solo para consultar versiones; el `pom.xml` está escrito a mano. Subir a Boot 4.2 / Spring AI 2.1 requiere decisión explícita.

## Skills del proyecto

### Available Skills
- `spring-boot-best-practices` (`.claude/skills/spring-boot-best-practices/`): capas, DTOs como records, mappers explícitos, `config/`, Maven Wrapper.

### Skill Trigger Rules
Activar `spring-boot-best-practices` al crear o modificar entidades, repositorios, servicios o controllers, añadir endpoints REST, crear un proyecto/API Spring Boot o refactorizar su arquitectura (p. ej. "create entity", "add repository", "add service", "add controller", "create endpoint", "refactor spring boot").

**Diferencias con la skill:** coincide en Java 25 / Boot 4.x, pero esta app usa el paquete `com.markcode.rag` (no `com.markcode.claude.springboot.<artifactId>.app`) y PostgreSQL+pgvector en vez de H2; en esos puntos **prevalece este archivo**; de la skill se conservan las reglas de capas, DTOs sin campos sensibles/gestionados por el servidor, mappers explícitos, `config/` centralizado y Maven Wrapper.
