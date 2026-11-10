# Plan técnico — Portal Inmobiliario

## 1. Arquitectura

Next.js se utilizará como framework full stack manteniendo una arquitectura REST clara.

```text
Next.js + React + Vite
      │
    fetch()
      │
      ▼
API REST /api/**
      │
      ▼
Capa de servicios
      │
      ▼
Repositorio / ORM
      │
      ▼
PostgreSQL
```

Integraciones externas:

```text
Cloudinary  → imágenes
Google Maps → ubicación
Web3Forms   → contacto
```

## 2. Tecnologías obligatorias

- Next.js
- React
- TypeScript
- PostgreSQL
- API REST con Route Handlers de Next.js
- Cloudinary
- Google Maps
- Web3Forms

## 3. Restricciones

- No utilizar Server Actions.
- No acceder a PostgreSQL directamente desde componentes React.
- No almacenar imágenes binarias en PostgreSQL.
- No exigir latitud/longitud en el formulario ADMIN.
- No implementar funcionalidades especulativas fuera de `spec.md`.

## 4. Estructura sugerida

```text
src/
├── app/
│   ├── api/
│   ├── admin/
│   ├── account/
│   ├── properties/
│   └── ...
├── components/
├── services/
├── repositories/
├── lib/
├── types/
└── ...
```

Adaptar cuando las convenciones actuales de Next.js lo justifiquen sin romper la separación de responsabilidades.

## 5. Modelo de datos

Entidades:

- User
- Property
- PropertyImage
- Feature
- Favorite
- Inquiry

Relaciones:

```text
User 1 --- * Favorite * --- 1 Property
User 1 --- * Inquiry  * --- 1 Property

Property 1 --- * PropertyImage
Property * --- * Feature
```

`Inquiry.userId` puede ser nulo para permitir consultas de visitantes.

## 6. Persistencia

PostgreSQL es la única base de datos.

Seleccionar un ORM compatible con las versiones actuales de Next.js y PostgreSQL.

Requisitos:

- migraciones;
- claves foráneas;
- restricciones de unicidad;
- índices cuando estén justificados;
- seed para desarrollo.

Restricciones importantes:

- `User.email` único;
- combinación `(userId, propertyId)` única en favoritos.

## 7. API REST

Propiedades públicas:

```text
GET /api/properties
GET /api/properties/{id}
```

Autenticación:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

Favoritos:

```text
GET    /api/favorites
POST   /api/favorites/{propertyId}
DELETE /api/favorites/{propertyId}
```

Consultas:

```text
POST /api/inquiries
```

Administración:

```text
GET    /api/admin/properties
POST   /api/admin/properties
GET    /api/admin/properties/{id}
PUT    /api/admin/properties/{id}
DELETE /api/admin/properties/{id}
```

Crear recursos REST adicionales cuando sean necesarios para:

- imágenes;
- características;
- usuarios;
- consultas.

## 8. Responsabilidades

### Route Handlers

- recibir y analizar HTTP;
- validar entrada básica;
- invocar servicios;
- devolver respuestas HTTP.

### Servicios

- lógica de aplicación;
- reglas de negocio;
- coordinación de persistencia e integraciones.

### Repositorios / ORM

- persistencia;
- consultas a PostgreSQL;
- sin lógica de presentación.

### React

- interfaz;
- interacción;
- estado visual;
- consumo de REST;
- sin acceso directo a base de datos.

## 9. Búsqueda y filtros

`GET /api/properties` debe soportar parámetros como:

```text
search
operation
type
minPrice
maxPrice
bedrooms
bathrooms
minUsableArea
commune
city
region
sort
```

El filtrado y ordenamiento debe ejecutarse principalmente en PostgreSQL y no cargando todo el catálogo en el navegador.

## 10. Autenticación y autorización

Utilizar un mecanismo seguro compatible con la API REST.

Requisitos:

- hashing de contraseñas;
- almacenamiento seguro de sesión/token;
- autorización en servidor;
- no almacenar tokens sensibles en `localStorage`;
- usuarios inactivos no pueden autenticarse;
- endpoints ADMIN requieren ADMIN;
- endpoints privados USER requieren autenticación.

## 11. Cloudinary

Flujo:

```text
ADMIN
  │
selecciona archivo
  │
  ▼
API REST
  │
  ▼
Cloudinary
  │
 URL + publicId
  │
  ▼
PostgreSQL
```

Validar:

- tipo;
- tamaño;
- autorización.

La eliminación debe mantener sincronizados Cloudinary y PostgreSQL.

## 12. Google Maps

Construir la ubicación utilizando:

- dirección;
- comuna;
- ciudad;
- región;
- país.

No solicitar coordenadas manuales.

Si posteriormente se requiere geocodificación interna, debe ser transparente para ADMIN y no modificar los campos obligatorios del formulario.

## 13. Web3Forms

Flujo:

1. validar datos;
2. identificar propiedad;
3. identificar usuario autenticado cuando exista;
4. persistir consulta;
5. enviar mediante Web3Forms;
6. devolver una respuesta REST consistente.

Definir un comportamiento claro ante fallos para evitar perder silenciosamente una consulta.

## 14. Errores

Utilizar códigos HTTP apropiados:

- 400
- 401
- 403
- 404
- 409
- 500

Formato recomendado:

```json
{
  "message": "Propiedad no encontrada",
  "status": 404
}
```

No exponer stack traces internos.

## 15. Variables de entorno

Utilizar variables de entorno para:

- conexión PostgreSQL;
- secretos de autenticación;
- credenciales Cloudinary;
- configuración Google Maps;
- clave Web3Forms.

Crear `.env.example` sin secretos reales.

## 16. Validación

Como mínimo validar:

- build;
- migraciones;
- endpoints REST;
- autenticación;
- autorización;
- filtros;
- favoritos;
- consultas;
- subida/eliminación Cloudinary;
- CRUD ADMIN;
- comportamiento responsive.

## 17. Definición de terminado

Una tarea está terminada cuando:

- cumple `spec.md`;
- respeta este plan;
- el build pasa;
- las validaciones correspondientes pasan;
- no quedan errores bloqueantes;
- su checkbox se actualiza en `tasks.md`.

## 18. Temas visuales (extensión)

Implementación con Tailwind CSS 4 y variables CSS:

- Tokens de color semánticos en `globals.css` (`background`, `foreground`, `surface`, `primary`, `primary-hover`, `primary-foreground`, `link`, `ring`, `danger`, `badge`, `badge-foreground`, `hero-tint`), expuestos a Tailwind mediante `@theme inline`.
- El tema se selecciona con el atributo `data-theme` de `<html>`: `light`, `dark` y `smallville`. El script inicial aplica el tema guardado o, sin elección guardada, `dark`/`light` según `prefers-color-scheme`; sin JavaScript, un bloque de respaldo sigue al sistema.
- Los componentes usan solo tokens (`bg-primary`, `text-link`, ...), nunca colores fijos, de modo que un tema nuevo solo añade un bloque de variables.
- Estado del tema en un store de Zustand; la preferencia se guarda en `localStorage` (no es información sensible).
- Un script en línea en `<head>` aplica el tema guardado antes del primer pintado para evitar parpadeo.
- Selector accesible (botón desplegable con menú de opciones) en el header y en el menú móvil, en el orden Claro, Oscuro y Smallville.
- Pruebas: store, selector y contraste WCAG calculado sobre los valores reales de `globals.css`.

## 19. Arquitectura monorepo (extensión)

> Sustituye la estructura de una sola aplicación de las secciones 1 y 4. La separación en capas (Route Handlers → servicios → repositorios → PostgreSQL) y las restricciones de la sección 3 no cambian.

Un único repositorio Git con pnpm Workspaces y Turborepo:

```text
apps/
  frontend/   Next.js: interfaz, estado, formularios, consumo de la API REST. Sin acceso a PostgreSQL.
  backend/    Next.js: solo Route Handlers /api/**, servicios, repositorios, Prisma, integraciones.
packages/
  shared-types/   DTOs y contratos de la API (tipos + esquemas Zod de entrada).
  api-client/     Cliente REST tipado usado por el frontend.
  eslint-config/  Configuración ESLint compartida.
docs/  .github/  docker/  resources/  specs/
```

Decisiones:

- Cada aplicación tiene sus propias dependencias, scripts, configuración Next.js, variables (`apps/*/.env.local`) y despliegue.
- El frontend llama siempre a `/api/**` de su propio origen y `rewrites` de Next.js lo reenvía al backend (`BACKEND_URL`). Mismo origen: sin CORS y con cookies de sesión sin configuración cross-site.
- El código compartido se consume como paquetes internos TypeScript (`@portal/*`) con `transpilePackages`.
- Las pruebas se mantienen con Vitest en cada app y paquete; Playwright para E2E.
- Turborepo orquesta `dev`, `build`, `lint`, `test` y `typecheck`. Prettier, Husky y lint-staged aplican calidad en cada commit.
- Fuera de alcance: IA/RAG, Ollama y pgvector no forman parte de esta especificación.

## 20. Filtros en sidebar lateral (extensión)

- Los filtros del catálogo se mueven a un sidebar izquierdo colapsable (en móvil se despliega sobre los resultados), para dejar más espacio a la cuadrícula.
- Selección múltiple con checkboxes: tipo de propiedad y operación. En la URL y en la API se envían separados por comas (`operation=SALE,RENT`, `type=HOUSE,APARTMENT`); un valor único sigue siendo válido.
- Selección única con select: ciudad y región. Sus opciones salen de `GET /api/locations` (valores distintos de propiedades publicadas), no de listas fijas.
- Se mantienen en el sidebar los demás filtros (precio, dormitorios, baños, superficie, colonia). La búsqueda de texto y el orden quedan sobre los resultados.
- Backend: el filtrado multivalor se aplica en PostgreSQL (`IN`).


## 21. Autenticación REST (Paso 17)

Decisiones que concretan la sección 10 de este plan:

- **Hashing**: `scrypt` de Node (`node:crypto`) con N=2^15, r=8, p=1, sal aleatoria de 16 bytes y comparación en tiempo constante. Se almacena como `scrypt$N$r$p$sal$hash`, de modo que los parámetros puedan subirse después. Sin dependencias nativas. Las contraseñas se normalizan a NFKC.
- **Sesión**: JWT firmado HS256 (`jose`) con `AUTH_SECRET` (mínimo 32 caracteres), 7 días de vigencia, entregado en la cookie `portal_session` (`HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` en producción). Nunca se usa `localStorage`.
- **El token solo lleva el id de usuario.** El rol y `isActive` se leen siempre de PostgreSQL, por lo que un cambio de rol o una desactivación surten efecto de inmediato (base para el Paso 18). Limitación conocida: el logout borra la cookie pero un token ya emitido sigue siendo válido hasta expirar; se mitiga porque cada solicitud revalida al usuario en la base.
- **Endpoints**: `POST /api/auth/register` (201, inicia sesión; el rol siempre es USER y se ignora cualquier `role` enviado), `POST /api/auth/login` (200; 401 con mensaje único para email desconocido o contraseña incorrecta; 403 para cuenta desactivada), `POST /api/auth/logout` (204, idempotente) y `GET /api/auth/me` (200; 401 sin sesión válida, y en ese caso se borra la cookie).
- **Enumeración de cuentas**: el login ejecuta una verificación ficticia cuando el email no existe para igualar tiempos de respuesta. Los emails se normalizan a minúsculas; la unicidad la garantiza `User.email` y un duplicado concurrente se traduce en 409.
- **Capas**: Route Handlers (HTTP y cookies) → `createAuthService` → `userRepository` → Prisma. El cliente `@portal/api-client` expone `registerUser`, `loginUser`, `logoutUser` y `fetchCurrentUser` (devuelve `null` ante 401).
- **Fuera de alcance del Paso 17** (pasos posteriores): roles y protección de rutas (Paso 18), formularios de registro/login y estado de sesión en la interfaz, y límite de intentos de login y rotación de secretos (Paso 34, seguridad).

## 22. Interfaz de acceso y cuentas de ejemplo (extensión)

- Rutas del frontend `/login` y `/register` (componentes de cliente con React Hook Form y los esquemas Zod de `@portal/shared-types`), que consumen `@portal/api-client` (`loginUser`, `registerUser`, `logoutUser`).
- Estado de sesión: hook `useCurrentUser` sobre SWR (`GET /api/auth/me`, 401 = sin sesión). Mientras no se conoce la sesión, el header reserva el espacio con un marcador, de modo que el primer render del cliente coincide con el HTML del servidor (sin desajuste de hidratación). Tras iniciar o cerrar sesión se actualiza la caché de SWR sin volver a consultar.
- Header: componente `AccountControls` (botón Ingresar, o nombre más Cerrar sesión). `loginNavigationItem` se separa de `headerMenuItems`; `publicNavigationItems` conserva Ingresar para el footer y las llamadas a la acción.
- Seed: `seedUsers` en `prisma/seed-data.ts` (admin, usuario activo e inactivo). `pnpm db:seed` las crea o restablece con `upsert` aunque ya existan propiedades; las contraseñas se guardan con scrypt. Solo desarrollo (el seed ya rechaza `NODE_ENV=production`).
- Fuera de alcance: rutas protegidas y redirección por rol (Paso 18), página `/account` (Paso 19) y recuperación de contraseña.

## 23. Autorización USER y ADMIN (Paso 18)

- Roles: `USER` y `ADMIN`; `hasRole(userRole, requiredRole)` en `@portal/shared-types` (ADMIN incluye los permisos de USER).
- Backend: `createAuthorizer(authService)` (`src/lib/auth/authorizer.ts`) expone `authenticate` (cookie → JWT → usuario vigente en base; 401) y `requireRole` (403 si el rol no alcanza). `withRole(rol, handler)` (`src/lib/http/with-role.ts`) envuelve un Route Handler y entrega `{ user, params }`. El rol nunca se toma del token, así que cambiar el rol o desactivar la cuenta surte efecto de inmediato.
- Frontend: `src/proxy.ts` (Next 16, reemplaza `middleware`) protege `/account/**` (USER) y `/admin/**` (ADMIN) consultando `GET /api/auth/me` con la cookie reenviada. Sin sesión redirige a `/login?next=<ruta>`; con rol insuficiente reescribe a `/forbidden` con estado 403; si el backend falla, deniega (falla cerrado). `src/lib/route-access.ts` define las reglas y `sanitizeNextPath` (solo rutas internas, evita redirección abierta). Login y registro vuelven a `next` tras autenticarse.
- El proxy solo evita servir páginas privadas; los datos se protegen en cada endpoint con `withRole`, que se aplicará a los endpoints de favoritos, consultas y administración (Pasos 20 en adelante).
- Fuera de alcance: las páginas `/account` y `/admin` (Pasos 19 y 28+) y endpoints protegidos concretos.

## 24. Cuenta de usuario (Paso 19)

- Ruta `/account` (protegida por `proxy.ts`, rol USER; ADMIN también entra). Página con metadatos `noindex` y componente de cliente `AccountOverview` que lee la sesión con `useCurrentUser` (sin endpoints nuevos).
- Muestra información básica (nombre, email, rol traducido) y dos secciones preparadas con estado vacío: «Propiedades interesadas» (se llenará con Favoritos, Paso 20) y «Propiedades consultadas» (con el seguimiento de consultas, Pasos posteriores). Cada sección es un `<section>` con encabezado h2 y enlace a `/properties`.
- El nombre del usuario en el header enlaza a `/account`.
- Fuera de alcance: editar perfil, listar favoritos o consultas reales.

## 25. Edición de la cuenta (extensión)

- Contrato: `updateProfileInputSchema` en `@portal/shared-types` (`name`, `email`, `currentPassword?`, `newPassword?`; las contraseñas vacías se tratan como ausentes; `newPassword` exige `currentPassword`). Se descartan campos desconocidos (como `role`).
- API: `PATCH /api/auth/me` protegido con `withRole("USER")`. 200 con el `AuthUserDto` actualizado; 400 validación; 401 sin sesión; 403 si falta o es incorrecta la contraseña actual al cambiar email o contraseña; 409 si el email pertenece a otra cuenta.
- Capas: `authService.updateProfile(userId, input)` → `userRepository.update(id, data)` (traduce P2002 a `ConflictError`). La nueva contraseña se guarda con el mismo hasher scrypt. La sesión no cambia: el token solo lleva el id.
- Cliente: `updateProfile` en `@portal/api-client`.
- Frontend: página independiente `/account/edit` (protegida por el prefijo `/account` del proxy) con el componente `ProfileForm` (React Hook Form + el esquema compartido); al guardar actualiza la sesión de SWR con `setUser`. `/account` muestra los datos y enlaza a «Editar datos»; la página de edición enlaza de vuelta a «Mi cuenta».

## 26. Favoritos (Paso 20)

- API (todas con `withRole("USER")`; ADMIN también puede): `GET /api/favorites` lista las propiedades guardadas como `PropertySummaryDto[]` (más recientes primero, solo publicadas); `PUT /api/favorites/{propertyId}` guarda (idempotente: repetirlo no duplica y responde 200; 404 si la propiedad no existe o no está publicada); `DELETE /api/favorites/{propertyId}` quita (204, también si no estaba guardada).
- Duplicados: restricción única `(userId, propertyId)` ya existente en `Favorite`; el repositorio absorbe la carrera (P2002) como "ya guardada".
- Capas: Route Handler → `createFavoriteService(repository)` → `favoriteRepository` → Prisma. El usuario sale siempre de la sesión.
- Cliente: `fetchFavorites`, `addFavorite`, `removeFavorite` en `@portal/api-client`.
- Frontend: hook `useFavorites` (SWR, solo con sesión) y `FavoriteButton` (corazón con `aria-pressed`) en la tarjeta y en el detalle; un visitante que lo pulsa va a `/login?next=<ruta actual>`. En `/account`, «Propiedades interesadas» lista las favoritas con las mismas tarjetas.
- Fuera de alcance: «Propiedades consultadas» (seguimiento de consultas por usuario) y favoritos de propiedades despublicadas.

## 27. Contador de favoritas en el navbar (extensión)

- `AccountControls` usa `useFavorites` (misma clave de SWR que las tarjetas, sin peticiones extra) y, con sesión y lista cargada, muestra un enlace a `/account` con corazón y la cantidad (`aria-label` «Mis favoritas: N»). Mientras la lista carga no se muestra (el primer render del cliente coincide con el del servidor).
