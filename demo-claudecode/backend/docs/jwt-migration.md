# Plan: migrar la autenticación de sesión opaca a JWT

Estado: **implementado** (commits `63c73bb` y `c825bfc`, 2026-10-26). Este documento queda como registro del plan y de las
decisiones; el comportamiento real está en el código, en `backend/docs/api.md` y en `backend/README.md`. Las secciones
"Estado actual" y "Diseño propuesto" describen el diseño original; ver "Qué cambió respecto al plan" y "Pendiente tras la
implementación" al final.

## Objetivo

Autenticar con JSON Web Tokens (access + refresh) manteniendo la arquitectura
`Controller → Service → Repository → Prisma → Database`, el aislamiento por dueño (`ownerId`) y las
protecciones actuales (límite de intentos, bloqueo de cuenta, rate limiting, guardia de origen).

## Estado anterior (lo que se reemplazó)

| Pieza | Antes |
| --- | --- |
| Token | Opaco aleatorio de 32 bytes en cookie httpOnly `session`; en BD solo su SHA-256 (`Session`) |
| Verificación | `AuthService.authenticate` busca la sesión en BD en cada petición |
| Contraseñas | scrypt (`src/utils/password.ts`) |
| Bloqueo | 5 fallos → 15 min (`User.failedLogins`, `lockedUntil`) |
| Cambio de contraseña | Revoca las demás sesiones |
| Roles | No hay |
| Refresh | No hay (sesión de 7 días) |

## Diseño propuesto

- **Librería:** `jose` (JWT/JWS, HS256, sin dependencias nativas).
- **Access token** (corto, por defecto 15 min): claims mínimos `sub` (id de usuario), `role`, `ver`
  (versión de tokens del usuario), `jti`, `iat`, `exp`, `iss`, `aud`. Sin email, sin datos sensibles.
  Se verifica con algoritmo fijado a HS256 (se rechaza `none` y cualquier otro algoritmo), `iss` y `aud`.
- **Refresh token** (largo, por defecto 7 días): también JWT firmado, con `jti` y `family`.
  En BD se guarda **solo el hash** del `jti`/token (`RefreshToken`), con rotación en cada uso y
  **detección de reutilización**: si llega un refresh ya rotado, se revoca toda su familia.
- **Transporte (decidido por el usuario el 2026-10-26):** `POST /auth/login` devuelve el access token en el
  cuerpo de la respuesta; el frontend lo guarda en **`localStorage`** y lo envía en cada petición con
  `Authorization: Bearer <token>`. El backend deja de leer y emitir la cookie `session`.
  - **Riesgo asumido:** cualquier script de la página puede leer `localStorage`, así que un XSS filtra la sesión.
    Mitigaciones obligatorias: CSP estricta (sin scripts inline ni de terceros), sin `dangerouslySetInnerHTML`,
    access token de vida corta y claims mínimos.
  - **CSRF:** deja de aplicar a las peticiones con Bearer (el navegador no lo envía solo). La guardia de origen de
    `src/proxy.ts` puede conservarse como defensa en profundidad, pero ya no es la protección principal.
  - **CORS:** permitir la cabecera `Authorization` solo para el origen explícito del frontend; `credentials` ya no es necesario.
  - **Refresh token:** su ubicación sigue abierta (ver "Decisiones abiertas"); no se guardará en `localStorage` sin decisión explícita.
- **Revocación:** el access token es válido hasta que expira; `ver` se compara con `User.tokenVersion`
  para que cambiar la contraseña o cerrar todas las sesiones invalide los access tokens vivos
  (una lectura de usuario por petición, que `withAuth` ya necesita para entregar el `AuthUser`).
- **Roles (RBAC):** `User.role` (`USER` por defecto, `ADMIN`) y wrapper `withRole(...)` encima de `withAuth`.
  Mínimo privilegio: los endpoints de facturas siguen siendo de `USER`, cada uno solo ve lo suyo (404, nunca 403).
- **Contraseñas:** se mantiene scrypt para no invalidar las contraseñas ya guardadas. `BCRYPT_ROUNDS` **no**
  se añade (ver "Decisiones abiertas").
- **Login:** mismos mensajes genéricos, mismo coste con hash señuelo, bloqueo por cuenta, límite por IP,
  y registro de auditoría (sin contraseñas ni tokens) de éxitos, fallos y bloqueos.

## Endpoints (prefijo `/api/v1`)

| Método | Ruta | Cambio |
| --- | --- | --- |
| POST | `/auth/login` | Devuelve el access token en el cuerpo (`{ data: { token, user: { id, email, role } } }`) y fija la cookie httpOnly del refresh |
| POST | `/auth/refresh` | **Nuevo.** Lee la cookie del refresh, la rota y devuelve un access nuevo en el cuerpo; 401 genérico si es inválido/reutilizado |
| POST | `/auth/logout` | Revoca la familia del refresh y limpia su cookie (el frontend borra el access token de `localStorage`) |
| GET | `/auth/me` | Igual, desde el access token |
| PUT/POST | `/auth/password` | Igual, e incrementa `tokenVersion` y revoca los demás refresh tokens |

## Variables de entorno (`backend/.env.example`, solo placeholders)

```
JWT_SECRET=            # >= 32 bytes aleatorios; el servidor no arranca si falta o es corto
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=facturas-api      # opcional
JWT_AUDIENCE=facturas-web    # opcional
```

El secreto real nunca se versiona ni se imprime en logs. Rotarlo invalida todos los tokens emitidos.

## Cambios por capa

**Prisma / persistencia** (`persistence-database-engineer`)
- Migración nueva (nunca editar las existentes): `User.role`, `User.tokenVersion`; tabla `RefreshToken`
  (`id`, `jti` hash único, `family`, `userId` con cascada, `expiresAt`, `revokedAt`, `replacedBy`, `createdAt`,
  índices por `userId`, `family`, `expiresAt`).
- Tabla `Session`: se elimina **en una migración posterior** al corte, no en la misma.
- `AuthRepository` / `PrismaAuthRepository`: métodos para crear, buscar, rotar y revocar refresh tokens y por familia,
  leer/incrementar `tokenVersion`. Sigue siendo el único acceso a Prisma.

**Backend** (`backend-architect-engineer`)
- `src/utils/jwt.ts` (firma/verificación con `jose`, config validada al arrancar).
- `AuthService`: `login`, `refresh`, `logout`, `authenticate(accessToken)`, `changePassword`. Toda la lógica aquí.
- `AuthController`: solo petición/respuesta y la cookie del refresh. `src/utils/cookies.ts`: solo la cookie `refresh` (el access viaja por `Authorization`).
- `withAuth` lee el access token; nuevo `withRole`. Rutas `src/app/api/v1/auth/refresh/route.ts`.
- `src/proxy.ts`: clase de rate limit propia para `/auth/refresh`; se mantiene la guardia de origen.
- Validadores, DTOs, `docs/api.md` y `container.ts` actualizados. `prisma/create-user.ts` admite `--role`.

**Frontend** (`frontend-architect-engineer`)
- `apiClient`: añade `Authorization: Bearer <token>` leyendo el token de `localStorage` (único punto de acceso,
  con `try/catch` por si el almacenamiento no está disponible). Ante un 401 fuera de `/auth/*`: un único intento de
  `/auth/refresh` (una sola petición en vuelo) y reintento de la original; si falla, el manejador existente borra el token,
  limpia los datos en caché y manda a `/login`. Se quita `credentials: "include"`.
- `useSession` incorpora `role`; el login guarda el token y el logout lo borra y avisa al backend.
- Verificar que el frontend no usa `dangerouslySetInnerHTML` ni scripts de terceros (el token es legible por scripts).

**Seguridad y QA** (`security-architect-engineer`, `qa-backend-engineer`, `qa-frontend-engineer`)
- Pruebas: firma inválida, `alg=none`, token expirado, `iss`/`aud` incorrectos, `ver` desactualizado, refresh reutilizado,
  rotación, logout, bloqueo, enumeración (misma respuesta y tiempo), rate limit de login y refresh, RBAC, aislamiento por dueño.
- E2E (Playwright + axe) con renovación transparente de sesión.
- Revisión final de seguridad en solo lectura.

## Orden de ejecución sugerido

1. Persistencia: migración + repositorio + pruebas.
2. Backend: `jwt.ts`, `AuthService`, controller, middleware, rutas, docs + pruebas.
3. Frontend: `apiClient` con refresh y `useSession`.
4. QA: pruebas unitarias, integración y E2E.
5. Seguridad: auditoría de solo lectura de todo el flujo.
6. Limpieza: migración que elimina `Session` y el código de sesión opaca; actualizar `CLAUDE.md` y `README`.

## Impacto y riesgos

- **Todos los usuarios deberán iniciar sesión de nuevo** al desplegar (las sesiones opacas dejan de valer).
- Si cambia `JWT_SECRET`, también se cierran todas las sesiones.
- Un access token robado vale hasta 15 min como máximo; `tokenVersion` lo corta al cambiar la contraseña.
- Sin Redis, el rate limiting sigue en memoria por proceso (límite conocido, ya existente).

## Decisiones (adoptadas el 2026-10-26: las recomendaciones del asistente, pedidas por el usuario)

1. **Transporte y refresh token.**
   - Access token: en el cuerpo de la respuesta, `localStorage` y `Authorization: Bearer` (decisión del usuario), vida corta (~15 min).
   - Refresh token: **cookie httpOnly con `Path=/api/v1/auth`**, usada solo por `/auth/refresh` (no legible por scripts), rotada en cada uso.
     Nunca en `localStorage`.
   - Límite conocido: un XSS activo en la página aún podría llamar a `/auth/refresh`; por eso la CSP estricta es obligatoria.
     La cookie exige que frontend y API compartan sitio (en producción, el mismo dominio registrable).
2. **Contraseñas:** se conserva **scrypt**; no se añade `BCRYPT_ROUNDS`. Antes de implementar, revisar los parámetros de
   `src/utils/password.ts` frente a lo que recomienda OWASP (N=2^17, r=8, p=1) y subirlos solo si hace falta, sin romper los hashes
   existentes (los parámetros van dentro del propio hash).
3. **`tokenVersion` por petición:** se mantiene la comprobación (una lectura por clave primaria que `withAuth` ya necesita), para que
   cambiar la contraseña o un bloqueo de cuenta corten al instante los tokens vivos.
4. **Roles:** columna `User.role` (`USER` por defecto), helper `withRole`, opción `--role` en `user:create` y sus pruebas.
   **Sin** rutas de administrador hasta que exista un caso de uso.
5. **Tabla `Session`:** se elimina en una **migración posterior y separada** del corte, una vez que JWT funcione, junto con el código de sesión opaca.

6. **Access token en cookie HttpOnly (decidida el 2026-10-26, EN CURSO; sustituye la parte del access token de la decisión 1).**
   - Despliegue elegido: **mismo origen** (reverse proxy que sirve el SPA y `/api` bajo el mismo host; en desarrollo, proxy de Vite).
     Sin CORS en producción, `SameSite=Strict` sin colisiones, `connect-src 'self'`.
   - Cookies: `at` (access, 15 min, `Path=/api/v1`) y `rt` (refresh, `Path=/api/v1/auth`), ambas `HttpOnly; Secure; SameSite=Strict`;
     prefijo `__Secure-` en producción, nombres planos en desarrollo/e2e. Login y refresh devuelven solo `{ user }`.
   - Bearer se conserva para scripts (`mode: "token"` en el login); si llegan Bearer y cookie, gana el Bearer.
   - CSRF: `SameSite=Strict` + guardia de `Origin` + `Sec-Fetch-Site` + cabecera custom en escrituras autenticadas por cookie.
   - Riesgo residual: un XSS activo sigue pudiendo actuar como el usuario mientras la pestaña esté abierta; la CSP estricta sigue siendo obligatoria.
   - Pasos: (1) esta decisión; (2) cabeceras de seguridad; (3) CSRF en `proxy.ts`; (4) backend dual tras flag; (5) frontend sin token;
     (6) corte; (7) limpieza (`accessToken` heredado y tabla `Session`).
   - Estado: pasos 1 a 4 hechos (el 4, modo dual con `AUTH_COOKIE_ACCESS=1`, apagado por defecto; `mode: "token"` queda para el corte, paso 6); lo demás **no está implementado**: hoy el access token sigue en `localStorage` y `Authorization: Bearer`.

Las decisiones 1 a 5 siguen vigentes salvo lo que sustituye la 6.

## Qué cambió respecto al plan

La auditoría de seguridad del 2026-10-26 (solo lectura, sin hallazgos críticos) llevó a endurecer lo implementado:

- **Rate limit** (`src/utils/rateLimit.ts`): `X-Forwarded-For` se ignora salvo que `TRUSTED_PROXY_HOPS` > 0 (entrada N-ésima desde
  la derecha); mapa de cubos con tope de 10.000 claves; sin IP fiable en producción no hay cubo compartido (se usa la credencial
  o no se limita). Límite adicional de login por email normalizado.
- **scrypt**: semáforo (`SCRYPT_CONCURRENCY`, por defecto 4) para acotar CPU y memoria. Los parámetros subieron a N=2^17 (M5, hecho; ver abajo).
- **Bloqueo de cuenta atómico**: el intento se reserva antes de verificar la contraseña (`reserveLoginAttempt`), así que el
  paralelismo no permite más de 5 verificaciones por ventana.
- **Ventana de gracia del refresh** (`REFRESH_REUSE_GRACE_SECONDS`, 0-60, por defecto 10): reutilizar un refresh recién rotado da 401
  sin revocar la familia, sin emitir tokens y sin borrar la cookie nueva. Fuera de la ventana se revoca la familia como se planeó.
- **Frontend**: el refresh se serializa entre pestañas con `navigator.locks`; si el logout falla, el flag local `loggedOut`
  impide restaurar la sesión con la cookie viva (ver `frontend/README.md`).
- Variables nuevas: `REFRESH_REUSE_GRACE_SECONDS`, `TRUSTED_PROXY_HOPS`, `SCRYPT_CONCURRENCY` (documentadas en `backend/.env.example`).

## M5 hecho (2026-10-26): scrypt a N=2^17

- `src/utils/password.ts`: parámetros por defecto N=2^17, r=8, p=1; `maxmem` calculado como 2·128·N·r; al verificar se rechazan parámetros fuera de rango (anti-DoS); `needsRehash(hash)`; hash señuelo (`decoyHash`) con los parámetros vigentes.
- `AuthService.login`: tras verificar y completar el login, rehash si el hash es más débil, con `AuthRepository.updatePasswordHash(userId, hash, expectedHash)` (condicional al hash verificado; no toca `tokenVersion`, bloqueos ni tokens; el fallo se audita y no rompe el login). La lógica de reserva de intentos no cambió.
- Medido (16 CPU, WSL2): N=2^15 ~80 ms; N=2^17 ~325 ms por derivación, 4 en paralelo ~460 ms, pico de RSS ~570 MiB (base ~56 MiB). `SCRYPT_CONCURRENCY=4` sigue siendo razonable en un servidor de 1 GiB o más libre; con menos RAM, usar 2.
- Riesgo residual: los usuarios que no inicien sesión mantienen su hash N=2^15 hasta su próximo login.

## Pendiente tras la implementación

- **B1**: el access token sigue válido hasta 15 min tras el logout (límite de un JWT sin estado); opciones: TTL menor o `sid` de familia.
- **B2/B3**: validar la entropía del secreto y derivar claves distintas para access y refresh.
- **B6** (HSTS, `X-Frame-Options`, `Permissions-Policy`) hecho en `next.config.ts`. **B7**: `FRONTEND_ORIGIN` obligatorio (con `https://`) en producción.
- **Limpieza**: la tabla `Session` y los métodos de sesión opaca del repositorio siguen presentes pero sin uso; se retiran en la migración posterior prevista en la decisión 5.
- Rol `ADMIN` y `withRole` existen sin rutas que los usen (decisión 4).
- Con varias instancias hace falta un almacén compartido (Redis) para el rate limit.
