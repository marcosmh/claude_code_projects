# Tareas — Portal Inmobiliario

> Ejecutar las tareas en orden. No comenzar la siguiente hasta implementar y validar la actual.

## Fase 1 — Fundamentos

- [x] **Paso 1 — Crear proyecto Next.js**
  - Crear proyecto con React y TypeScript.
  - Configurar estructura básica.
  - Crear `.env.example`.
  - Validar servidor de desarrollo y build.

- [x] **Paso 2 — Layout y navegación**
  - Crear header, navegación, footer y layout.
  - Agregar diseño responsive base.
  - Navegación: Inicio, Propiedades, Comprar, Arrendar, Ingresar.

- [x] **Paso 3 — Configurar PostgreSQL**
  - Configurar PostgreSQL.
  - Seleccionar y configurar ORM.
  - Configurar migraciones.
  - Validar conexión.

- [x] **Paso 4 — Crear modelo de dominio**
  - User.
  - Property.
  - PropertyImage.
  - Feature.
  - Favorite.
  - Inquiry.
  - Crear relaciones y constraints.
  - Ejecutar migraciones.

- [x] **Paso 5 — Crear seed**
  - Propiedades realistas de venta y arriendo.
  - Casas, departamentos, terrenos y oficinas.
  - Diferentes comunas, precios y características.

## Fase 2 — Portal público

- [x] **Paso 6 — API REST pública de propiedades**
  - `GET /api/properties`.
  - `GET /api/properties/{id}`.
  - Mostrar públicamente solo propiedades publicadas.
  - Separar API, servicios y persistencia.

- [x] **Paso 7 — Landing page**
  - Hero.
  - Buscador.
  - Propiedades destacadas.
  - Secciones comprar y arrendar.
  - Llamadas a la acción.

- [x] **Paso 8 — PropertyCard y grid responsive**
  - Crear componente reutilizable.
  - Imagen, título, precio, operación, ubicación, dormitorios, baños y superficie.
  - Crear grid responsive.

- [x] **Paso 9 — Catálogo**
  - Crear `/properties`.
  - Consumir API REST.
  - Mostrar propiedades publicadas.

- [x] **Paso 10 — Búsqueda**
  - Búsqueda textual.
  - Título, comuna, ciudad, región y descripción.
  - Reflejar búsqueda en query parameters.

- [x] **Paso 11 — Filtros**
  - Venta/arriendo.
  - Tipo.
  - Rango de precio.
  - Dormitorios.
  - Baños.
  - Superficie mínima.
  - Comuna/ciudad/región.
  - Permitir filtros combinados.

- [x] **Paso 12 — Ordenamiento y estados**
  - Más recientes.
  - Precio ascendente/descendente.
  - Superficie ascendente/descendente.
  - Loading, vacío y error.
  - Skeletons cuando aporten valor.

- [x] **Paso 13 — Detalle de propiedad**
  - Crear `/properties/{id}`.
  - Mostrar información completa.
  - Consumir exclusivamente API REST.

- [x] **Paso 14 — Galería**
  - Imagen principal.
  - Miniaturas.
  - Navegación.
  - Responsive.

- [x] **Paso 15 — Google Maps**
  - Construir ubicación desde dirección, comuna, ciudad y región.
  - Integrar Google Maps.
  - No solicitar latitud/longitud manual.

- [x] **Paso 16 — Contacto con Web3Forms**
  - Formulario de contacto.
  - Incluir ID/título de propiedad.
  - Estados enviando/éxito/error.
  - Validar datos.

## Fase 3 — Autenticación y usuario

- [x] **Paso 17 — Registro y login REST**
  - Registro.
  - Login.
  - Logout.
  - Endpoint de usuario actual.
  - Hashing seguro.

- [x] **Paso 18 — Autorización USER y ADMIN**
  - [x] Crear roles (`hasRole` en `@portal/shared-types`: ADMIN incluye USER).
  - [x] Proteger APIs (`authorizer.requireRole` y `withRole` en el backend; `/api/auth/me` ya usa el autorizador).
  - [x] Proteger páginas (`src/proxy.ts`: sin sesión → `/login?next=…`, rol insuficiente → `/forbidden` 403).
  - [x] Aplicar permisos en backend (rol leído de la base en cada petición; cuenta inactiva o eliminada pierde acceso).

- [x] **Paso 19 — Cuenta de usuario**
  - [x] Crear `/account` (protegida por `proxy.ts`).
  - [x] Mostrar información básica (nombre, email, rol).
  - [x] Preparar secciones de propiedades interesadas y consultadas (estado vacío).

- [x] **Paso 20 — Favoritos**
  - [x] Listar.
  - [x] Agregar.
  - [x] Eliminar.
  - [x] Evitar duplicados.
  - [x] Integrar en interfaz.

- [x] **Paso 21 — Persistir consultas**
  - [x] Crear consulta mediante REST.
  - [x] Persistir en PostgreSQL.
  - [x] Asociar propiedad.
  - [x] Asociar usuario cuando exista.
  - [x] Integrar envío Web3Forms.

## Fase 4 — Administración

- [x] **Paso 22 — Dashboard ADMIN**
  - [x] Crear `/admin`.
  - [x] Mostrar indicadores.
  - [x] Restringir a ADMIN.
  - [x] ADMIN va a `/admin` al iniciar sesión y ve el enlace «Administración».

- [x] **Paso 23 — CRUD REST de propiedades**
  - [x] Listar (con borradores, paginado, búsqueda y filtro de estado).
  - [x] Crear.
  - [x] Obtener.
  - [x] Actualizar.
  - [x] Eliminar.
  - [x] Proteger endpoints (solo ADMIN).

- [ ] **Paso 24 — Interfaz de administración**
  - `/admin/properties`.
  - `/admin/properties/new`.
  - `/admin/properties/{id}/edit`.

- [ ] **Paso 25 — Formulario de propiedad**
  - Título y descripción.
  - Operación y tipo.
  - Precio.
  - Superficie útil/total.
  - Dormitorios, baños y estacionamientos.
  - Antigüedad.
  - Dirección, comuna, ciudad y región.
  - Características.
  - Publicada/destacada.
  - No agregar latitud/longitud manual.

- [ ] **Paso 26 — Subida a Cloudinary**
  - Configurar Cloudinary.
  - Crear subida segura mediante REST.
  - Validar tipo y tamaño.
  - Guardar URL y `publicId`.

- [ ] **Paso 27 — Administración de imágenes**
  - Múltiples imágenes.
  - Eliminar.
  - Seleccionar principal.
  - Ordenar.
  - Mantener sincronizados Cloudinary y PostgreSQL.

- [ ] **Paso 28 — Características**
  - Múltiples características por propiedad.
  - Modelo flexible.
  - Permitir nuevas características sin modificar columnas de Property.

- [ ] **Paso 29 — Usuarios**
  - Crear `/admin/users`.
  - Listar y buscar.
  - Activar/desactivar.
  - Modificar rol cuando corresponda.

- [ ] **Paso 30 — Consultas**
  - Crear `/admin/inquiries`.
  - Mostrar propiedad, usuario, contacto, mensaje y fecha.
  - Enlazar propiedad asociada.

## Fase 5 — Calidad y finalización

- [ ] **Paso 31 — SEO y metadata**
  - Metadata dinámica.
  - Título.
  - Descripción.
  - Open Graph.

- [ ] **Paso 32 — Optimización**
  - Optimizar imágenes Next.js/Cloudinary.
  - Evitar imágenes sobredimensionadas.
  - Revisar solicitudes duplicadas.
  - Revisar consultas PostgreSQL.

- [ ] **Paso 33 — Responsive y accesibilidad**
  - Desktop.
  - Tablet.
  - Móvil.
  - Labels, teclado, foco, alt y semántica.

- [ ] **Paso 34 — Seguridad**
  - Autenticación.
  - Autorización.
  - Validación REST.
  - Uploads.
  - Secretos.
  - Cloudinary.
  - Web3Forms.
  - Endpoints ADMIN.

- [ ] **Paso 35 — QA integral**
  - Flujos visitante.
  - Flujos USER.
  - Flujos ADMIN.
  - Errores y códigos HTTP.
  - Corregir defectos bloqueantes.

- [ ] **Paso 36 — Cumplimiento arquitectónico**
  - Confirmar que no existen Server Actions.
  - Confirmar comunicación REST.
  - Confirmar PostgreSQL.
  - Confirmar que React no accede a DB.
  - Confirmar permisos backend.
  - Confirmar integraciones externas.

- [ ] **Paso 37 — Convergencia final del SDD**
  - Releer `spec.md`.
  - Releer `plan.md`.
  - Comparar implementación con requisitos.
  - Corregir faltantes o inconsistencias.
  - Ejecutar build y validaciones finales.
  - Confirmar ausencia de errores bloqueantes.

## Extra — Extensiones fuera de la secuencia 1-37

- [x] **Extra A — Temas visuales (Claro, Oscuro, Smallville)**
  - Tokens de color semánticos con Tailwind CSS 4.
  - Temas Claro y Oscuro (el original) y tema Smallville oscuro (rojo y azul).
  - Selector desplegable de tema en el header (escritorio y móvil), con preferencia persistente y sin parpadeo; primera visita según el sistema.
  - Contraste WCAG AA verificado por pruebas.

- [x] **Extra B — Migración a monorepo (apps/frontend, apps/backend, packages/*)**
  - pnpm Workspaces + Turborepo.
  - Frontend y backend como apps Next.js independientes, con proxy `rewrites` hacia la API.
  - Paquetes compartidos: shared-types, api-client y eslint-config.
  - Prettier, Husky, lint-staged y CI en GitHub Actions.
  - `pnpm dev`, `pnpm dev:frontend`, `pnpm dev:backend` y `pnpm build`.
  - Todas las pruebas, lint y build siguen pasando.

- [x] **Extra C — Filtros en sidebar lateral colapsable**
  - Sidebar izquierdo colapsable con los filtros del catálogo.
  - Checkboxes de selección múltiple para tipo de propiedad y operación.
  - Selects de selección única para ciudad y región, con opciones desde `GET /api/locations`.
  - Filtros multivalor en la API (`operation=SALE,RENT`) y en la URL.
  - Pruebas, lint y build pasan.

- [x] **Extra D — Interfaz de acceso y cuentas de ejemplo**
  - Botón «Ingresar» en el header (escritorio y móvil); con sesión muestra el nombre y «Cerrar sesión».
  - Páginas `/login` y `/register` sobre la API REST del Paso 17.
  - Hook `useCurrentUser` (SWR) sin desajuste de hidratación.
  - Cuentas de ejemplo en el seed (ADMIN, USER y USER inactivo) y su uso en Postman y REST Client.
  - Pruebas, lint, typecheck y build pasan.

- [x] **Extra E — Edición de la cuenta**
  - `PATCH /api/auth/me` protegido con `withRole("USER")` (nombre, email y contraseña con la actual).
  - Página independiente `/account/edit` con el formulario precargado, enlazada desde `/account`, que actualiza la sesión.
  - Pruebas, lint, typecheck y build pasan.

- [x] **Extra F — Contador de favoritas en el navbar**
  - Enlace con corazón y cantidad de favoritas junto al nombre (escritorio y móvil), solo con sesión.
  - Se actualiza al guardar o quitar favoritas.
  - Pruebas, lint, typecheck y build pasan.

- [x] **Extra G — Correo de consultas desde el navegador y propiedades consultadas**
  - Quitar el envío por Web3Forms del backend (403 en plan gratuito) y enviarlo desde el navegador tras guardar.
  - `GET /api/inquiries/properties` y sección «Propiedades consultadas» en `/account`.
  - Pruebas, lint, typecheck y build pasan.

- [x] **Extra H — Lista compacta de consultas con eliminación**
  - `GET /api/inquiries/mine` y `DELETE /api/inquiries/{id}` (solo del propio usuario).
  - «Propiedades consultadas» como lista compacta: miniatura, título, asunto, mensaje y «Eliminar».
  - Pruebas, lint, typecheck y build pasan.

- [x] **Extra I — Paginación (6) y búsqueda de consultas**
  - `GET /api/inquiries/mine` con `page`, `pageSize` y `q` (título o mensaje), solo del usuario autenticado.
  - Buscador y paginación en «Propiedades consultadas».
  - Pruebas, lint, typecheck y build pasan.

- [x] **Extra J — Modal de confirmación al eliminar**
  - Modal «Sí, eliminar» / «No, cancelar» en lugar de `window.confirm`.
  - Pruebas, lint, typecheck y build pasan.

- [x] **Extra K — Borrado lógico de propiedades**
  - Columna `deletedAt` y migración; `DELETE` marca en lugar de borrar.
  - Excluir eliminadas del catálogo, favoritos, consultas, indicadores y administración.
  - Pruebas, lint, typecheck y build pasan.

- [x] **Extra L — Área de administración independiente**
  - Layout propio con sidebar colapsable y paleta corporativa; menú de módulos (los no construidos, deshabilitados).
  - Dashboard con indicadores y tabla de propiedades recientes.
  - ADMIN sin funciones de usuario final (redirección de `/account`, 403 en favoritos y consultas propias, header sin cuenta ni favoritos).
  - Pruebas, lint, typecheck y build pasan.

- [x] **Extra M — Punto de entrada según rol**
  - `/` redirige a `/admin` (ADMIN) o a `/portal` (USER y visitantes); la landing vive en `/portal`.
  - Pruebas, lint, typecheck y build pasan.
