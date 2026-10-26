# Plan: migrar la autenticación de sesión opaca a JWT

Estado: **plan aprobado, implementación pendiente de orden del usuario** (decisión del 2026-10-26).
Nada de este documento está implementado todavía. El código actual usa sesiones con cookie (ver `CLAUDE.md`).

## Objetivo

Autenticar con JSON Web Tokens (access + refresh) manteniendo la arquitectura
`Controller → Service → Repository → Prisma → Database`, el aislamiento por dueño (`ownerId`) y las
protecciones actuales (límite de intentos, bloqueo de cuenta, rate limiting, guardia de origen).

## Estado actual (lo que se reemplaza)

| Pieza | Hoy |
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

No queda ninguna decisión abierta. La implementación espera la orden explícita del usuario.
