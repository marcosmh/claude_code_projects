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

## 28. Persistir consultas y asociar usuario (Paso 21)

- El Paso 16 ya dejó `POST /api/inquiries` (validación Zod), persistencia en PostgreSQL (`Inquiry`), asociación con la propiedad publicada y notificación por Web3Forms (se persiste primero; si Web3Forms falla la consulta se conserva con `notificationSent=false`). El Paso 21 completa «asociar usuario cuando exista».
- `authorizer.authenticateOptional(request)` devuelve el usuario de la sesión o `null` si no hay sesión válida (cookie ausente, manipulada, expirada o cuenta inactiva); nunca falla por eso, porque la consulta sigue siendo pública. Cualquier otro error se propaga.
- `POST /api/inquiries` guarda `userId` con el usuario autenticado y `null` para visitantes. El `userId` jamás se lee del cuerpo de la solicitud. Si el usuario se elimina, `Inquiry.userId` queda en `null` (`onDelete: SetNull`) y la consulta se conserva.
- Fuera de alcance: listar las consultas del usuario («Propiedades consultadas») y su gestión por el ADMIN (Pasos posteriores).

## 29. Correo desde el navegador y propiedades consultadas (extensión)

- Backend: `InquiryService` deja de recibir el notificador; `POST /api/inquiries` solo valida, persiste y devuelve `{ id }`. Se elimina `lib/integrations/web3forms.ts` y `WEB3FORMS_ACCESS_KEY` del backend.
- Frontend: `lib/web3forms.ts` (`sendInquiryEmail`) hace el `POST` a `https://api.web3forms.com/submit` con `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` (asunto, nombre, email como respuesta, teléfono, mensaje, id y título de la propiedad). `ContactForm` guarda primero y luego envía; si el correo falla muestra «consulta guardada, aviso no enviado». Sin clave configurada no intenta enviar.
- `GET /api/inquiries/properties` (`withRole("USER")`): propiedades publicadas sobre las que el usuario consultó, sin repetir, la consulta más reciente primero (`PropertySummaryDto[]`). Hook `useInquiredProperties` (SWR) y sección «Propiedades consultadas» en `/account` con las tarjetas; el formulario de contacto refresca esa lista al guardar.

## 30. Lista compacta de consultas y eliminación (extensión)

- Contrato (`@portal/shared-types`): `UserInquiryDto { id, propertyId, propertyTitle, propertyImageUrl, subject, message, createdAt }` y `buildInquirySubject(title)` (compartido por el correo y la lista).
- Backend: `GET /api/inquiries/mine` (`withRole("USER")`, reemplaza a `/api/inquiries/properties`) devuelve las consultas del usuario, la más reciente primero; `DELETE /api/inquiries/[inquiryId]` (`withRole("USER")`, 204; 404 si no existe o pertenece a otro usuario). Repositorio: `listByUser` y `deleteByIdAndUser`.
- api-client: `fetchUserInquiries`, `deleteInquiry`. Frontend: hook `useUserInquiries` (reemplaza a `useInquiredProperties`) y `InquiredSection` como lista compacta con eliminación y confirmación.

## 31. Paginación y búsqueda de consultas (extensión)

- `GET /api/inquiries/mine?page=1&pageSize=6&q=texto` (`withRole("USER")`) responde `PaginatedResponse<UserInquiryDto>`. Esquema Zod `userInquiryListQuerySchema` en `@portal/shared-types` (`page` ≥ 1, `pageSize` 1–50, por defecto 6, `q` ≤ 100 caracteres); parámetros inválidos → 400.
- Repositorio: `findPageByUser({ userId, skip, take, searchText })` con `unaccent` + `ILIKE` sobre el título de la propiedad y el mensaje, siempre con `userId` y propiedad publicada en la condición; devuelve registros y total.
- api-client: `fetchUserInquiries(query)` y `buildUserInquiriesUrl`. Hook `useUserInquiries({ page, searchText })` (SWR con la URL como clave, `keepPreviousData`). `InquiredSection` guarda página y búsqueda en estado local (con retardo al escribir) y muestra paginación propia con botones.

## 32. Confirmación visual al eliminar (extensión)

- Componente reutilizable `components/ui/ConfirmDialog.tsx` (`title`, `description`, `confirmLabel`, `cancelLabel`, `isBusy`, `onConfirm`, `onCancel`), sin dependencias nuevas. `InquiredSection` lo abre con la consulta seleccionada y elimina solo al confirmar.

## 33. Panel de administración (Paso 22)

- Contrato: `AdminDashboardDto { totalProperties, publishedProperties, propertiesForSale, propertiesForRent, users, inquiries }` en `@portal/shared-types`.
- Backend: `GET /api/admin/dashboard` (`withRole("ADMIN")`, `Cache-Control: no-store`) → `adminService.getDashboard()` → `adminRepository.countIndicators()` (conteos Prisma en paralelo). Venta/arriendo cuentan propiedades publicadas.
- api-client: `fetchAdminDashboard`. Frontend: `app/admin/page.tsx` + `AdminDashboard` (SWR, tarjetas de indicadores con estados de carga/error) y enlace «Administración» en `AccountControls` solo para ADMIN.
- `resolvePostLoginPath(role, next)` en `lib/route-access.ts`: ADMIN sin `next` → `/admin`; en otro caso `sanitizeNextPath(next)`. `LoginForm` lo usa.

## 34. CRUD REST de propiedades (Paso 23)

- Contratos (`@portal/shared-types`, `property-admin.ts`): `propertyInputSchema` (Zod; `price` > 0, textos recortados con límites, enteros ≥ 0, `usableArea ≤ totalArea`), `adminPropertyListQuerySchema` (`page`, `pageSize` por defecto 10 y máximo 50, `search`, `status`), `AdminPropertyDto` (detalle + `isPublished`) y `AdminPropertyListItemDto` (resumen + `isPublished`, `updatedAt`).
- Backend: `adminPropertyRepository` (`findPage`, `findById`, `create`, `update`, `remove`; búsqueda `unaccent` + `ILIKE` reutilizando `buildTextConditions`) → `createAdminPropertyService` → Route Handlers `app/api/admin/properties/route.ts` (GET, POST) y `[id]/route.ts` (GET, PUT, DELETE) con `withRole("ADMIN")` y `parseJsonBody`.
- api-client: funciones `fetchAdminProperties`, `fetchAdminProperty`, `createAdminProperty`, `updateAdminProperty`, `deleteAdminProperty` para la interfaz del Paso 24.
- Fuera de alcance: interfaz (Paso 24), formulario (25), Cloudinary (26–27) y características (28).

## 35. Borrado lógico de propiedades (extensión)

- Esquema: `Property.deletedAt DateTime?` con índice y migración aditiva `add_property_deleted_at`.
- `adminPropertyRepository.remove` hace `updateMany({ where: { id, deletedAt: null }, data: { deletedAt: now, isPublished: false, isFeatured: false } })`; `findPage`, `findById`, `update` y `remove` filtran `deletedAt: null`.
- Las rutas públicas, favoritos y consultas ya exigen `isPublished = true`, por lo que excluyen las eliminadas sin más cambios. `adminRepository.countIndicators` cuenta `totalProperties` con `deletedAt: null`.

## 36. Área de administración independiente (extensión)

- Rutas: el portal pasa al grupo `app/(portal)/` con su layout (Header, contenido, Footer); `app/admin/` tiene su propio layout. El layout raíz solo conserva `<html>`, `<body>` y el enlace de salto.
- Estilos: clase `.admin-area` en `globals.css` que redefine los tokens de color (pizarra/índigo, contraste AA) y añade `--sidebar*`, con una variante para `data-theme="dark"` y otra para `"smallville"`. La barra superior incluye `ThemeSwitcher` y el botón de colapsar (en la barra lateral lo tapaba el indicador de desarrollo de Next).
- Componentes (`components/admin/`): `AdminShell` (estado colapsado persistido en `localStorage` con `try/catch`, panel móvil), `AdminSidebar` + `adminNavigation` (lista de módulos con `href` o `null` si no existe aún), `AdminTopBar`, `AdminDashboard` (indicadores + `RecentPropertiesTable`).
- Autorización: `protectedRoutes` indica si un rol superior también accede (`allowHigherRoles`); `/account` lo desactiva y el `proxy.ts` redirige al ADMIN a `/admin`. Backend: `withRole(rol, handler, { exact: true })` y `authorizer.requireRole(..., { exact: true })` para favoritos y consultas propias.
- `useFavorites` y `useUserInquiries` no consultan para un ADMIN; `FavoriteButton` no se muestra a un ADMIN; `AccountControls` muestra a un ADMIN solo «Administración» y «Cerrar sesión».

## 37. Punto de entrada según rol (extensión)

- La landing pasa de `app/(portal)/page.tsx` a `app/(portal)/portal/page.tsx` (ruta `/portal`).
- `proxy.ts` también intercepta `/`: consulta la sesión y redirige a `/admin` (ADMIN) o a `/portal` (resto). La decisión vive en `resolveEntryPath(role)` de `lib/route-access.ts`. El `matcher` agrega `"/"`.
- `navigation.ts`, `Header` y `AccountControls` usan `/portal` como inicio.

## 38. Interfaz de administración de propiedades (Paso 24)

- Rutas: `app/admin/properties/page.tsx`, `new/page.tsx` y `[id]/edit/page.tsx` (`params` asíncrono dentro de `Suspense`).
- Componentes (`components/admin/`): `AdminPropertiesList` (SWR con `buildAdminPropertiesUrl`, búsqueda, estado, paginación, `ConfirmDialog`), `AdminPageHeader` (título + migas) y `AdminPropertyEditor` (carga `fetchAdminProperty`; marcador del formulario del Paso 25).
- `adminNavigation`: `properties.href = "/admin/properties"`.

## 39. Formulario de propiedad (Paso 25)

- `schemas/property-form.ts`: esquema del formulario con valores de texto (los `input` HTML) que se transforman a números y se validan con `propertyInputSchema` (`transform` + `pipe`); `propertyToFormValues` rellena la edición.
- `components/admin/PropertyForm.tsx` (RHF + `zodResolver`) y `property-form-fields.tsx` (select, textarea y checkbox accesibles). `AdminPropertyEditor` lo monta (crear sin datos; editar con la propiedad cargada).
- Al guardar se invalidan las cachés SWR de administración y se navega a `/admin/properties`.

## 40. Filtros avanzados en panel lateral (Extra N)

- Prisma: enum `PropertyAvailability` y columna `Property.availability` (default `AVAILABLE`, índice con `isPublished`); migración propia.
- Contratos: `propertyAvailabilityValues`, `availability` en `PropertySummaryDto` y en `propertyInputSchema`; `availability`, `publishedFrom` y `publishedTo` en `propertyListQuerySchema` y en `buildPropertiesUrl`.
- Backend: `PropertyFilters` suma `availabilities`, `publishedFrom`, `publishedTo` (rango sobre `createdAt`); el servicio los traduce desde la consulta.
- Frontend: el panel queda a la izquierda (antes de los resultados); `FiltersSidebar` aplica los cambios con `router.replace` (inmediato en casillas/listas, con *debounce* en texto, números y fechas) y sincroniza el formulario solo ante cambios externos de la URL; `PropertyCard` muestra la etiqueta de estado; el formulario de administración incluye el selector de estado.

## 41. Filtros avanzados en la administración (Extra O)

- `property-list-query.ts` exporta `advancedFilterShape` (operación, tipo, estado, fechas y precio) que reutilizan la consulta pública y `adminPropertyListQuerySchema`, con las mismas validaciones de rango.
- `adminPropertyRepository.findPage` aplica los filtros en PostgreSQL (`buildCommonWhere` compartido con el repositorio público). `buildAdminPropertiesUrl` los serializa.
- UI: `AdminPropertiesList` usa un panel derecho colapsable (`AdminPropertyFilters`) con estado local; se aplica dinámicamente con *debounce* en los campos escritos.

## 42. Subida a Cloudinary (Paso 26)

- `lib/cloudinary/cloudinary-storage.ts`: `loadCloudinaryConfig(env)`, `signParameters` (SHA-1 de los parámetros ordenados + secreto) y `createCloudinaryStorage(getConfig, fetch)` con `upload` y `remove` sobre la API REST de Cloudinary (sin SDK); la configuración se lee al usarse.
- `repositories/property-image-repository.ts` (`create` calcula `position` y `isPrimary` en una transacción) y `services/property-image-service.ts` (valida tipo, firma real y tamaño; sube; guarda; compensa borrando de Cloudinary si falla PostgreSQL).
- Route Handler `app/api/admin/properties/[id]/images/route.ts` (POST, `withRole("ADMIN")`).
- Errores de dominio nuevos: `ValidationError` (400), `PayloadTooLargeError` (413), `UnsupportedMediaTypeError` (415), `BadGatewayError` (502) y `ServiceUnavailableError` (503).
- Contratos en `@portal/shared-types` (`property-image.ts`): tipos permitidos y tamaño máximo, para reutilizarlos en el Paso 27.

## 43. Administración de imágenes (Paso 27)

- Contratos (`property-image.ts`): `reorderImagesInputSchema` y `setPrimaryImageInputSchema`.
- Repositorio de imágenes: `findOwned`, `delete` (promueve una principal y compacta posiciones en una transacción), `setPrimary` y `reorder` (valida el conjunto exacto de ids). Servicio: `deleteImage` (Cloudinary → PostgreSQL), `setPrimaryImage`, `reorderImages`.
- Rutas: `images/[imageId]/route.ts` (PATCH, DELETE) y PUT en `images/route.ts`, todas con `withRole("ADMIN")`.
- Frontend: `@portal/api-client` (`admin-images-client.ts`: subir, eliminar, principal y ordenar), componente `PropertyImagesManager` (subida múltiple con validación previa, iconos de acción, `ConfirmDialog` al eliminar) dentro de `AdminPropertyEditor`; al crear una propiedad se navega a su edición.

## 44. Administración de características (Paso 28)

- Contratos (`feature.ts`): `featureInputSchema` y `setPropertyFeaturesInputSchema`.
- Backend: `feature-repository` (listar, crear con slug único, ids existentes, reemplazar las de una propiedad) y `feature-service` (`slugifyFeatureName`, 409 en duplicados, 400 en ids desconocidos). Rutas `api/admin/features` (GET, POST) y `api/admin/properties/[id]/features` (PUT), con `withRole("ADMIN")`.
- api-client: `admin-features-client.ts`. Frontend: `PropertyFeaturesManager` dentro de `AdminPropertyEditor`, bajo el gestor de imágenes.

## 45. Administración de usuarios (Paso 29)

- Contratos (`admin-user.ts`): `AdminUserDto`, `adminUserListQuerySchema`, `updateAdminUserInputSchema`.
- Backend: `admin-user-repository` (página con búsqueda `unaccent`+`ILIKE`, por id, actualización) y `admin-user-service` (regla de no modificarse a sí mismo → 403). Rutas `api/admin/users` (GET), `api/admin/users/[id]` (GET, PATCH) con `withRole("ADMIN")`.
- api-client: `admin-users-client.ts`. Frontend: `AdminUsersList` en `app/admin/users/page.tsx`; el menú lateral activa «Administrar usuarios».

## 46. Administración de consultas (Paso 30)

- Contratos (`admin-inquiry.ts`): `AdminInquiryDto` y `adminInquiryListQuerySchema`. Backend: `admin-inquiry-repository` (búsqueda `unaccent`+`ILIKE` por términos), `admin-inquiry-service` y ruta `api/admin/inquiries` (GET) con `withRole("ADMIN")`.
- api-client: `admin-inquiries-client.ts`. Frontend: `AdminInquiriesList` en `app/admin/inquiries/page.tsx`; el menú activa «Administrar consultas».
