# Backend de facturas

API REST en Next.js 16 (route handlers, sin páginas) + TypeScript + Prisma 7 (SQLite). Contrato completo en [docs/api.md](docs/api.md).

## Arquitectura

```
src/app/api/v1/**/route.ts   handler HTTP (solo enruta, envuelto con withErrorHandler)
        -> src/controllers   parsean la petición y devuelven la respuesta HTTP
        -> src/services      toda la lógica de negocio (dependen de la interfaz InvoiceRepository)
        -> src/repositories  único acceso a Prisma
```

Las rutas de facturas y estadísticas van envueltas con `withAuth` (`src/middleware/withAuth.ts`): resuelve el access token (`Authorization: Bearer`) a un usuario (401 si no es válido) y se lo pasa al controlador; `withRole(...)` se apoya en él para exigir un rol (403). Todo repositorio de facturas recibe ese `ownerId` y lo aplica en cada consulta.

Otros: `src/validators` (zod), `src/dto` (contratos y mapper), `src/domain` (totales, overdue, número), `src/middleware` (manejo de errores), `src/proxy.ts` (CORS y rate limiting; en Next 16 `middleware` se llama `proxy`), `src/container.ts` (composición), `src/utils`.

## Puesta en marcha

```bash
cp .env.example .env     # DATABASE_URL y FRONTEND_ORIGIN
npm install
npm run db:migrate       # aplica migraciones
npm run user:create -- ana@example.com   # pide la contraseña (mín. 12 caracteres); el primer usuario hereda las facturas existentes sin dueño
npm run db:seed -- --force   # ATENCIÓN: borra las facturas y siembra 20 (no corre con NODE_ENV=production)
npm run dev              # http://localhost:4000
```

Ejecutar siempre desde `backend/`: la `DATABASE_URL` relativa se resuelve contra el cwd.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | servidor de desarrollo en el puerto 4000 |
| `npm run build` / `npm start` | build y servidor de producción (puerto 4000) |
| `npm test` | vitest (usa una base SQLite temporal y repositorio falso; nunca `prisma/dev.db`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` / `db:generate` / `db:seed` | Prisma |
| `npm run user:create -- <email> [--role USER\|ADMIN]` | crea un usuario (no hay registro público); contraseña por prompt oculto o variable `USER_PASSWORD` |

## Variables de entorno

- `DATABASE_URL` (por defecto `file:./prisma/dev.db`)
- `FRONTEND_ORIGIN` origen(es) CORS permitidos, separados por comas (por defecto `http://localhost:5173`)
- `JWT_SECRET` **obligatoria**: al menos 32 bytes aleatorios (`openssl rand -base64 48`). El servidor no arranca si falta o es corta; nunca se imprime ni se versiona. Cambiarla cierra todas las sesiones.
- `JWT_EXPIRES_IN` (access token, por defecto `15m`), `JWT_REFRESH_EXPIRES_IN` (refresh token, por defecto `7d`); formato `<número><s|m|h|d>`
- `JWT_ISSUER` (por defecto `facturas-api`) y `JWT_AUDIENCE` (por defecto `facturas-web`)
- `RATE_LIMIT_DISABLED=1` desactiva el rate limiting (solo para la suite E2E; se ignora con `NODE_ENV=production`)
- `NEXT_DIST_DIR` directorio de build de Next (por defecto `.next`; la suite E2E usa `.next-e2e` para no chocar con `npm run dev`)

## Autenticación y autorización

- **Tokens (JWT, `jose`, solo HS256)**: `POST /auth/login` devuelve un access token (15 min, claims mínimos `sub`, `role`, `ver`, `jti`, `iat`, `exp`, `iss`, `aud`) que el cliente envía como `Authorization: Bearer`, y fija el refresh token en la cookie `refresh` (`HttpOnly`, `SameSite=Strict`, `Path=/api/v1/auth`, `Secure` con `NODE_ENV=production`). En la BD solo se guarda el SHA-256 del `jti` del refresh (`RefreshToken`); se rota en cada uso y un refresh reutilizado revoca toda su familia. `ver` se compara con `User.tokenVersion` en cada petición (cambiar la contraseña corta los access tokens vivos). La tabla `Session` y su repositorio siguen en el código pero ya no se usan (se retirarán en la limpieza final de la migración).
- **Contraseñas**: scrypt (incluido en Node) con sal aleatoria; mínimo 12 caracteres al crear la cuenta.
- **Alta de usuarios**: solo con `npm run user:create`. No existe endpoint de registro.
- **Autorización**: cada factura tiene `ownerId`. Un usuario solo ve y modifica las suyas; las de otro responden 404, igual que un id inexistente. Estadísticas y PDF también están acotados.
- **Facturas anteriores a la autenticación** (`ownerId` nulo): las reclama el primer usuario que se crea. Mientras no tengan dueño nadie puede verlas.
- **CSRF**: las peticiones con Bearer no son vulnerables (el navegador no lo envía solo); para la cookie del refresh, además de `SameSite=Strict`, `src/proxy.ts` devuelve 403 a cualquier escritura cuyo `Origin` no esté en `FRONTEND_ORIGIN`, y las escrituras exigen `Content-Type: application/json`.
- **Login**: límite propio de 10 intentos por minuto y por IP (compartido con el cambio de contraseña), y el mismo 401 para email desconocido, contraseña errónea y cuenta bloqueada.
- **Bloqueo de cuenta**: 5 fallos seguidos bloquean la cuenta 15 minutos (`failedLogins` / `lockedUntil` en `User`); un login correcto reinicia el contador. Es un compromiso: protege de adivinar contraseñas desde varias IP, pero permite a un tercero que conozca el email bloquear esa cuenta temporalmente.
- **Cambio de contraseña**: `POST /auth/password` (access token + contraseña actual); incrementa `tokenVersion` y revoca los refresh tokens de los demás dispositivos.
- **Roles**: `User.role` (`USER` por defecto, `ADMIN`; `npm run user:create -- <email> --role ADMIN`). `withRole(...)` (en `container`) responde 403 si el rol no basta. Ninguna ruta lo exige todavía, y las facturas siguen acotadas por dueño (404) incluso para un `ADMIN`.
- Frontend y API deben compartir *site* (p. ej. `localhost:5173` y `localhost:4000`); si se despliegan en dominios distintos habrá que cambiar `SameSite` a `None; Secure`.
- Pendiente: rutas de administrador (hay roles, pero ningún caso de uso), recuperación de contraseña olvidada (sin correo, se resetea con un script) y desbloqueo manual antes de los 15 minutos.
