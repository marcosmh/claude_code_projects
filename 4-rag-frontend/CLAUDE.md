# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este directorio

Frontend React 19 + Vite + TypeScript + Tailwind 4 para el backend Spring Boot RAG del proyecto hermano `../3-rag-springai` (Spring AI, Ollama `qwen3:4b` + `nomic-embed-text`, PostgreSQL + pgvector). Además contiene las colecciones para probar sus APIs.

```
src/                             # App.tsx (layout 3 paneles), api.ts (fetch a /api/*), types.ts (espejo de los DTOs)
└── components/                  # UploadPanel (documentos + upload), ChatPanel (ask + copiar vía navigator.clipboard), SourcesPanel (fuentes de una respuesta)
src/main/resources/
├── postman/postman-api.json     # colección Postman v2.1 (variable baseUrl, tests por request)
├── rest-client/rest-client.http # mismas peticiones para IntelliJ HTTP Client / VS Code REST Client
└── archives/                    # PDFs de prueba (copiados del backend)
.claude/skills/                  # vercel-react-best-practices, web-design-guidelines: aplicarlas al tocar UI
```

## Comandos (frontend)

```bash
npm install
npm run dev          # Vite en :5173; proxifica /api -> http://localhost:8080 (VITE_BACKEND_URL para cambiarlo)
npm run build        # tsc + vite build
npm run typecheck && npm run lint
npm test             # vitest run (todos)
npx vitest run -t "envía la pregunta"   # un solo test
```

El backend **no tiene CORS**: en desarrollo siempre se pasa por el proxy de Vite (`vite.config.ts`); para un despliegue estático hace falta un reverse proxy o añadir CORS al backend (`VITE_API_BASE` fija el prefijo de la API).

## Endpoints del backend (http://localhost:8080)

- `POST /api/documents/upload` — `multipart/form-data`, campo `file` (PDF, máx. 20MB). 201 → `{id, fileName, uploadedAt, pageCount, sizeBytes, chunkCount}`. 400 `ProblemDetail` "Documento inválido" si no es PDF (se valida la firma `%PDF-`) o falta `file`.
- `POST /api/rag/ask` — JSON `{"question": "..."}` (`@NotBlank`, máx. 2000). 200 → `{answer, sources:[{documentId,fileName,page,score,snippet}]}`. Sin fragmentos relevantes: `sources=[]` y mensaje fijo "No encontré información relevante…" sin llamar al LLM. 400 con lista `errors` si la pregunta está en blanco; 503 si Ollama no responde.
- Auxiliares: `/actuator/health`, `/v3/api-docs`, `/swagger-ui.html`.

## Ejecutar y probar

El backend debe estar levantado (desde `../3-rag-springai`; Ollama local en `:11434` con los modelos ya descargados):

```bash
cd ../3-rag-springai
docker compose up -d postgres        # pgvector en el puerto 5434
./mvnw -DskipTests spring-boot:run   # API en :8080
```

Luego: importar `postman-api.json` en Postman (variable `baseUrl`; `documentId` se rellena sola tras un upload) o ejecutar `rest-client.http` directamente. Los uploads de Postman usan **rutas absolutas** a `src/main/resources/archives` (si Postman no encuentra el archivo, reseleccionarlo en `file`); el `.http` usa rutas relativas (`../archives/...`).

## Convenciones

- **Mantener sincronizados** `postman-api.json` y `rest-client.http`: todo endpoint o caso nuevo va en ambos, con la misma numeración (1.x documentos, 2.x consultas, 3.x operación).
- Estos archivos son una copia de los equivalentes en `../3-rag-springai/src/main/resources/{postman,rest-client}` (ajustando rutas de PDFs); si el contrato del backend cambia (DTOs `AskRequest`, `AskResponse`, `SourceDto`, `DocumentResponse`), actualizar aquí también.
- Las preguntas de ejemplo dependen de los PDFs de `archives/` (`rag-legal-arbitraje.pdf`, `legal-japon-alemania-maquinaria.pdf`) y deben subirse antes de consultar.
- Los errores del backend llegan como `ProblemDetail` (`title`, `detail`, `errors[]`); `api.ts` los convierte en mensajes mostrados con `role="alert"`.
