# mcp-weather

Servidor MCP (stdio) en TypeScript que da la hora local y el clima de una ciudad y recomienda qué ropa usar. Usa [Open-Meteo](https://open-meteo.com) (gratis para uso no comercial, sin API key). Es independiente de la app de facturas.

## Herramientas

Ambas son de solo lectura.

| Herramienta | Entradas | Devuelve |
| --- | --- | --- |
| `get_weather` | `city` (2-80 caracteres), `country` (código ISO de 2 letras, opcional), `units` (`metric` por defecto, o `imperial`) | Hora local con desfase UTC, condición, temperatura y sensación, mínima/máxima, humedad, viento y ráfagas, precipitación y probabilidad, UV. Texto y `structuredContent` |
| `recommend_clothing` | las mismas más `activity` (`casual` por defecto, `deporte`, `trabajo`, `exterior`) | Ropa, abrigo, calzado y accesorios, con el porqué (lluvia, viento, UV, amplitud térmica, humedad) |

Los errores (ciudad no encontrada, servicio caído) llegan como error de herramienta con un mensaje legible; los inesperados se registran por stderr y se reportan de forma genérica.

## Uso

```bash
cd apps/mcp-weather
npm run build
node dist/index.js        # habla MCP por stdin/stdout
```

Registrarlo en Claude Code (desde la raíz del monorepo; no está en `.mcp.json`):

```bash
claude mcp add weather -- node "$(pwd)/apps/mcp-weather/dist/index.js"
```

o en `.mcp.json`:

```json
{ "mcpServers": { "weather": { "command": "node", "args": ["apps/mcp-weather/dist/index.js"] } } }
```

En desarrollo, `npm run dev` ejecuta `src/index.ts` con `tsx`.

## Diseño

`tools` (validación Zod, formato) -> `WeatherService` (caché: ubicación 1 h, pronóstico 10 min) -> `WeatherProvider` (`OpenMeteoProvider`: timeout de 5 s, valida la respuesta con Zod). Las reglas de vestimenta son funciones puras en `src/domain/clothing.ts` (por sensación térmica, con ajustes por lluvia, nieve, viento, UV, amplitud térmica y actividad). El proveedor siempre pide unidades métricas; la conversión a imperial se hace en el borde. Stdout es del protocolo: los logs van a stderr. Solo el nombre de la ciudad sale de la máquina.

## Pruebas

`npm test` (Vitest, sin red: `fetch` simulado y un cliente MCP en memoria), `npm run test:coverage` (umbrales 90/85/90/90), `npm run lint`, `npm run typecheck`.
