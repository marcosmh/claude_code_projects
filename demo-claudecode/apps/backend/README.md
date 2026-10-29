# Backend de facturas

API REST en Next.js 16 (route handlers, sin páginas) + TypeScript + Prisma 7 (PostgreSQL / Supabase). Contrato completo en [docs/api.md](docs/api.md).

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
| `npm test` | vitest (los tests de repositorio usan un schema temporal `test_*` de la base de `DATABASE_URL`, que se borra al terminar; el resto, repositorio falso; nunca el schema `public`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` / `db:generate` / `db:seed` | Prisma |
| `npm run user:create -- <email> [--role USER\|ADMIN]` | crea un usuario (no hay registro público); contraseña por prompt oculto o variable `USER_PASSWORD` |

## Variables de entorno

- `DATABASE_URL` (obligatoria; cadena PostgreSQL, en Supabase el Session pooler, puerto 5432)
- `FRONTEND_ORIGIN` origen(es) CORS permitidos, separados por comas (por defecto `http://localhost:5173`)
- `JWT_SECRET` **obligatoria**: al menos 32 bytes aleatorios (`openssl rand -base64 48`). El servidor no arranca si falta o es corta; nunca se imprime ni se versiona. Cambiarla cierra todas las sesiones.
- `JWT_EXPIRES_IN` (access token, por defecto `15m`), `JWT_REFRESH_EXPIRES_IN` (refresh token, por defecto `7d`); formato `<número><s|m|h|d>`
- `REFRESH_REUSE_GRACE_SECONDS` (opcional, entero 0-60, por defecto `10`): tras rotar un refresh token, reutilizarlo dentro de esta ventana da 401 sin revocar la familia (dos pestañas, respuesta perdida); fuera de ella se revoca la familia. `0` la desactiva. Un token robado y usado dentro de la ventana tampoco recibe tokens nuevos, pero la sesión legítima no se cierra.
- `JWT_ISSUER` (por defecto `facturas-api`) y `JWT_AUDIENCE` (por defecto `facturas-web`)
- `TRUSTED_PROXY_HOPS` (entero, por defecto `0`): cuántos proxies inversos de confianza hay delante de la API y añaden su entrada a `X-Forwarded-For`. Con `0` las cabeceras `X-Forwarded-For` y `X-Real-IP` se **ignoran** (un cliente puede falsearlas para evadir el rate limit) y Next 16 no expone la IP del socket, así que no hay IP fiable: en desarrollo todas las peticiones comparten el cubo `local`; en producción no hay cubo global compartido (así nadie puede agotar el cupo de los demás): las peticiones con credencial se limitan por token, el login solo por el límite por email (10/min) y las peticiones sin IP ni credencial no tienen límite por IP. Con `N>0` se usa la entrada N-ésima **desde la derecha** de `X-Forwarded-For` (o `X-Real-IP` si la cadena es más corta). Configúralo siempre en producción, y solo si el proxy sobrescribe/añade la cabecera y la API no es accesible sin pasar por él.
- `SCRYPT_CONCURRENCY` (por defecto `4`): derivaciones scrypt simultáneas (cada una usa ~128 MiB con N=2^17 y un hilo de libuv); el resto espera en cola. Pico con 4 derivaciones simultáneas: ~512 MiB sobre la base del proceso (medido: ~570 MiB de RSS en total). Si el servidor tiene poca RAM, baja el valor (p. ej. `2`).
- `RATE_LIMIT_DISABLED=1` desactiva el rate limiting (solo para la suite E2E; se ignora con `NODE_ENV=production`)
- `NEXT_DIST_DIR` directorio de build de Next (por defecto `.next`; la suite E2E usa `.next-e2e` para no chocar con `npm run dev`)

## Autenticación y autorización

- **Tokens (JWT, `jose`, solo HS256)**: `POST /auth/login` devuelve un access token (15 min, claims mínimos `sub`, `role`, `ver`, `jti`, `iat`, `exp`, `iss`, `aud`) que el cliente envía como `Authorization: Bearer`, y fija el refresh token en la cookie `refresh` (`HttpOnly`, `SameSite=Strict`, `Path=/api/v1/auth`, `Secure` con `NODE_ENV=production`). En la BD solo se guarda el SHA-256 del `jti` del refresh (`RefreshToken`); se rota en cada uso y un refresh reutilizado revoca toda su familia. `ver` se compara con `User.tokenVersion` en cada petición (cambiar la contraseña corta los access tokens vivos). La tabla `Session` y su repositorio siguen en el código pero ya no se usan (se retirarán en la limpieza final de la migración).
- **Contraseñas**: scrypt (incluido en Node) con sal aleatoria y parámetros N=2^17, r=8, p=1 (mínimo OWASP; ~0,3 s y 128 MiB por derivación, medido en desarrollo); mínimo 12 caracteres al crear la cuenta. El hash guarda sus parámetros (`scrypt$N$r$p$sal$clave`), así que los hashes antiguos (N=2^15) siguen verificándose. **Rehash**: tras un login correcto, si el hash guardado usa parámetros inferiores a los vigentes (`needsRehash`), se recalcula y se guarda (solo si el hash no cambió entretanto; no toca `tokenVersion` ni los refresh tokens; un fallo se audita como `password_rehash_failed` y no rompe el login). Los usuarios que no inician sesión conservan su hash antiguo. Al verificar se rechazan (sin derivar) hashes con parámetros fuera de rango (N potencia de 2 entre 2^12 y 2^17, r ≤ 16, p ≤ 4, memoria ≤ 128 MiB, clave de 64 bytes), para que un hash manipulado no pueda provocar un DoS. La verificación de un email inexistente usa un hash señuelo con los parámetros vigentes, con el mismo coste que un usuario real con hash nuevo. En tests los parámetros se bajan con `setScryptParamsForTests` (`tests/setup.ts`), que lanza error fuera de `NODE_ENV=test`.
- **Alta de usuarios**: solo con `npm run user:create`. No existe endpoint de registro.
- **Autorización**: cada factura tiene `ownerId`. Un usuario solo ve y modifica las suyas; las de otro responden 404, igual que un id inexistente. Estadísticas y PDF también están acotados.
- **Facturas anteriores a la autenticación** (`ownerId` nulo): las reclama el primer usuario que se crea. Mientras no tengan dueño nadie puede verlas.
- **CSRF**: las peticiones con Bearer no son vulnerables (el navegador no lo envía solo); para la cookie del refresh, además de `SameSite=Strict`, `src/proxy.ts` devuelve 403 a cualquier escritura cuyo `Origin` no esté en `FRONTEND_ORIGIN`, y las escrituras exigen `Content-Type: application/json`.
- **Login**: límite propio de 10 intentos por minuto y por IP (compartido con el cambio de contraseña), y el mismo 401 para email desconocido, contraseña errónea y cuenta bloqueada.
- **Bloqueo de cuenta**: 5 fallos seguidos bloquean la cuenta 15 minutos (`failedLogins` / `lockedUntil` en `User`); un login correcto reinicia el contador. El intento se reserva de forma atómica antes de verificar la contraseña (`reserveLoginAttempt` / `settleFailedLogin` / `completeLogin` en el repositorio): logins paralelos no pueden verificar más de 5 contraseñas por ventana ni colar una correcta antes de que se cuenten los fallos. Es un compromiso: protege de adivinar contraseñas desde varias IP, pero permite a un tercero que conozca el email bloquear esa cuenta temporalmente.
- **Cambio de contraseña**: `POST /auth/password` (access token + contraseña actual); incrementa `tokenVersion` y revoca los refresh tokens de los demás dispositivos.
- **Roles**: `User.role` (`USER` por defecto, `ADMIN`; `npm run user:create -- <email> --role ADMIN`). `withRole(...)` (en `container`) responde 403 si el rol no basta. Ninguna ruta lo exige todavía, y las facturas siguen acotadas por dueño (404) incluso para un `ADMIN`.
- Frontend y API deben compartir *site* (p. ej. `localhost:5173` y `localhost:4000`); si se despliegan en dominios distintos habrá que cambiar `SameSite` a `None; Secure`.
- Pendiente: rutas de administrador (hay roles, pero ningún caso de uso), recuperación de contraseña olvidada (sin correo, se resetea con un script) y desbloqueo manual antes de los 15 minutos.
