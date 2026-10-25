# Backend de facturas

API REST en Next.js 16 (route handlers, sin páginas) + TypeScript + Prisma 7 (SQLite). Contrato completo en [docs/api.md](docs/api.md).

## Arquitectura

```
src/app/api/v1/**/route.ts   handler HTTP (solo enruta, envuelto con withErrorHandler)
        -> src/controllers   parsean la petición y devuelven la respuesta HTTP
        -> src/services      toda la lógica de negocio (dependen de la interfaz InvoiceRepository)
        -> src/repositories  único acceso a Prisma
```

Las rutas de facturas y estadísticas van envueltas con `withAuth` (`src/middleware/withAuth.ts`): resuelve la cookie de sesión a un usuario (401 si no hay) y le pasa su `id` al controlador. Todo repositorio de facturas recibe ese `ownerId` y lo aplica en cada consulta.

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
| `npm run user:create -- <email>` | crea un usuario (no hay registro público); contraseña por prompt oculto o variable `USER_PASSWORD` |

## Variables de entorno

- `DATABASE_URL` (por defecto `file:./prisma/dev.db`)
- `FRONTEND_ORIGIN` origen(es) CORS permitidos, separados por comas (por defecto `http://localhost:5173`)
- `RATE_LIMIT_DISABLED=1` desactiva el rate limiting (solo para la suite E2E; se ignora con `NODE_ENV=production`)
- `NEXT_DIST_DIR` directorio de build de Next (por defecto `.next`; la suite E2E usa `.next-e2e` para no chocar con `npm run dev`)

## Autenticación y autorización

- **Sesión**: `POST /auth/login` crea una sesión en la base de datos y fija la cookie `session` (token aleatorio de 256 bits; en la BD solo se guarda su SHA-256). La cookie es `HttpOnly`, `SameSite=Lax` y `Secure` con `NODE_ENV=production`; dura 7 días y `POST /auth/logout` la revoca.
- **Contraseñas**: scrypt (incluido en Node) con sal aleatoria; mínimo 12 caracteres al crear la cuenta.
- **Alta de usuarios**: solo con `npm run user:create`. No existe endpoint de registro.
- **Autorización**: cada factura tiene `ownerId`. Un usuario solo ve y modifica las suyas; las de otro responden 404, igual que un id inexistente. Estadísticas y PDF también están acotados.
- **Facturas anteriores a la autenticación** (`ownerId` nulo): las reclama el primer usuario que se crea. Mientras no tengan dueño nadie puede verlas.
- **CSRF**: además de `SameSite`, `src/proxy.ts` devuelve 403 a cualquier escritura cuyo `Origin` no esté en `FRONTEND_ORIGIN`, y las escrituras exigen `Content-Type: application/json`.
- **Login**: límite propio de 10 intentos por minuto y por IP (compartido con el cambio de contraseña), y el mismo 401 para email desconocido, contraseña errónea y cuenta bloqueada.
- **Bloqueo de cuenta**: 5 fallos seguidos bloquean la cuenta 15 minutos (`failedLogins` / `lockedUntil` en `User`); un login correcto reinicia el contador. Es un compromiso: protege de adivinar contraseñas desde varias IP, pero permite a un tercero que conozca el email bloquear esa cuenta temporalmente.
- **Cambio de contraseña**: `POST /auth/password` (sesión + contraseña actual); revoca las demás sesiones del usuario.
- Frontend y API deben compartir *site* (p. ej. `localhost:5173` y `localhost:4000`); si se despliegan en dominios distintos habrá que cambiar `SameSite` a `None; Secure`.
- Pendiente: roles (hoy no hay 403 por permisos, solo por origen), recuperación de contraseña olvidada (sin correo, se resetea con un script) y desbloqueo manual antes de los 15 minutos.
