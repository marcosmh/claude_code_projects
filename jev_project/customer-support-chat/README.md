# Chat de atención al cliente con Jev

MVP en JavaScript vanilla + Tailwind (CDN). Cada mensaje del cliente se analiza con Jev (API System One de TypeSafe) y el resultado se muestra en un Panel de Decisiones.

## Uso

1. Edita `.env` y pon tu clave: `JEV_API_KEY=...`
2. `node server.js` (Node 18+, sin dependencias)
3. Abre http://localhost:3000

## Estructura

- `server.js` — sirve los archivos y reenvía `POST /api/jev` a Jev añadiendo la API key (el navegador no puede leer `.env` y la clave no debe exponerse).
- `js/jev-service.js` — define las preguntas e interpreta las respuestas.
- `js/chat.js` — estado del chat y respuestas del asistente según la acción.
- `js/ui.js` — render de burbujas y del panel.
- `js/app.js` — une todo.

## Primitivas de Jev

| Primitiva | Uso |
|-----------|-----|
| `choice`  | categoría, prioridad y acción recomendada |
| `score`   | riesgo de abandono (escala de 5 niveles → 0–100 %) |
| `nuol`    | (`noul` en la API) probabilidad sí/no de señales: enfado, amenaza de irse, dinero, urgencia |

Una pregunta `nuol` devuelve una probabilidad, no texto, así que la explicación se redacta en `jev-service.js` a partir de las señales que Jev marca como probables (> 50 %).

Las 8 preguntas se envían en una sola llamada a `/v1/systemone`.
