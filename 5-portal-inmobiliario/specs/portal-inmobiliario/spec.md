# Especificación del producto — Portal Inmobiliario

## 1. Visión del producto

Construir un portal inmobiliario full stack orientado inicialmente al mercado Mexicano.

Los visitantes podrán descubrir propiedades en venta o arriendo, buscarlas y filtrarlas, consultar su información completa, visualizar fotografías y una ubicación aproximada en el mapa, y solicitar información sobre una propiedad.

Los usuarios registrados podrán guardar propiedades de interés y consultar las propiedades por las cuales han realizado solicitudes.

Los administradores podrán gestionar el portal desde un área privada de administración.

---

## 2. Tipos de usuario

### Visitante

Puede:

- acceder a la landing page;
- navegar por propiedades publicadas;
- buscar propiedades;
- aplicar filtros;
- ordenar resultados;
- consultar el detalle de una propiedad;
- visualizar la galería;
- consultar características;
- visualizar la ubicación mediante Google Maps;
- enviar una solicitud de información;
- registrarse;
- iniciar sesión.

### USER

Puede realizar todas las acciones públicas y además:

- cerrar sesión;
- acceder a su cuenta;
- guardar propiedades como favoritas o interesadas;
- eliminar propiedades guardadas;
- consultar sus propiedades interesadas;
- consultar propiedades por las cuales ha realizado solicitudes.

### ADMIN

> Actualizado por la sección 38: el ADMIN usa solo el área de administración y no las funciones de usuario final (cuenta, favoritos, consultas propias).

Puede:

- acceder al panel administrativo;
- crear propiedades;
- editar propiedades;
- eliminar propiedades;
- publicar y despublicar propiedades;
- marcar propiedades como destacadas;
- administrar imágenes;
- administrar características;
- administrar usuarios;
- revisar solicitudes de información.

---

## 3. Información de una propiedad

Cada propiedad debe soportar como mínimo:

- título;
- descripción;
- tipo de operación;
- tipo de propiedad;
- precio;
- metros cuadrados útiles;
- metros cuadrados totales;
- número de dormitorios;
- número de baños;
- número de estacionamientos;
- antigüedad;
- dirección;
- comuna;
- ciudad;
- región;
- estado de publicación;
- indicador de propiedad destacada;
- fecha de creación;
- fecha de actualización.

### Tipo de operación

Valores:

- `SALE`
- `RENT`

### Tipo de propiedad

Valores iniciales:

- `HOUSE`
- `APARTMENT`
- `LAND`
- `OFFICE`
- `COMMERCIAL`
- `OTHER`

### Moneda

Debe soportar `MXN`,`USD`

Algunos campos podrán ser opcionales cuando no correspondan al tipo de propiedad.

---

## 4. Características del inmueble

Las características deben modelarse de forma flexible.

Ejemplos:

- piscina;
- gimnasio;
- quincho;
- lavandería;
- jardín;
- terraza;
- bodega;
- ascensor;
- conserjería;
- seguridad;
- calefacción;
- aire acondicionado;
- pet friendly.

No crear una columna booleana en `Property` para cada característica.

Una propiedad puede tener múltiples características y una característica puede pertenecer a múltiples propiedades.

---

## 5. Imágenes

Una propiedad puede contener múltiples imágenes.

Debe ser posible:

- subir múltiples imágenes;
- definir una imagen principal;
- ordenar imágenes;
- eliminar imágenes.

Las imágenes se almacenan en Cloudinary.

PostgreSQL almacena solamente la información necesaria para relacionarlas y administrarlas:

- URL;
- `publicId` de Cloudinary;
- posición;
- indicador de imagen principal.

---

## 6. Ubicación

El administrador no debe ingresar latitud ni longitud manualmente.

El formulario utiliza:

- dirección;
- comuna;
- ciudad;
- región.

Ejemplo:

```text
Av. Paseo Villas Las Joya 1011
Villas Las Joya
Querétaro
México
```

La aplicación construirá una dirección completa utilizable por Google Maps.

```text
Av. Paseo Villas Las Joya 1011, Villas Las Joya, Querétaro, México
```

La ubicación mostrada públicamente puede ser aproximada cuando corresponda.

Latitud y longitud no deben ser campos obligatorios del formulario administrativo.

---

## 7. Landing page

Debe incluir:

- header;
- navegación;
- hero;
- buscador principal;
- propiedades destacadas;
- propiedades en venta;
- propiedades en arriendo;
- llamadas a la acción;
- footer.

Navegación pública inicial:

- Inicio
- Propiedades
- Comprar
- Arrendar
- Ingresar

---

## 8. Catálogo

El catálogo debe:

- mostrar únicamente propiedades publicadas;
- utilizar un grid responsive;
- utilizar tarjetas reutilizables;
- contemplar estados de carga, vacío y error.

Cada tarjeta mostrará, cuando corresponda:

- imagen principal;
- título;
- precio;
- operación;
- tipo;
- comuna o ubicación;
- dormitorios;
- baños;
- superficie útil.

---

## 9. Búsqueda

Permitir búsqueda textual sobre información relevante:

- título;
- comuna;
- ciudad;
- región;
- descripción.

La búsqueda debe quedar representada mediante parámetros de consulta.

```text
/properties?search=providencia
```

---

## 10. Filtros

Permitir combinar:

- venta/arriendo;
- tipo de propiedad;
- precio mínimo;
- precio máximo;
- dormitorios;
- baños;
- superficie útil mínima;
- comuna;
- ciudad;
- región.

Los filtros deben representarse en la URL.

Presentación (extensión, secciones 28 y 40 del plan): los filtros viven en un sidebar lateral izquierdo colapsable (spec §42), con estado y fecha de publicación además de los anteriores. Tipo de propiedad y operación admiten selección múltiple (checkboxes); ciudad y región son de selección única (listas desplegables con los valores existentes).

```text
/properties?operation=SALE&commune=las-condes&bedrooms=3
```

---

## 11. Ordenamiento

Permitir:

- más recientes;
- precio menor a mayor;
- precio mayor a menor;
- superficie menor a mayor;
- superficie mayor a menor.

---

## 12. Detalle de propiedad

Mostrar:

- título;
- precio;
- descripción;
- operación;
- tipo;
- superficie útil;
- superficie total;
- dormitorios;
- baños;
- estacionamientos;
- antigüedad;
- características;
- galería;
- ubicación;
- formulario de contacto.

---

## 13. Google Maps

El detalle debe mostrar Google Maps utilizando la dirección textual de la propiedad.

La configuración debe manejarse mediante variables de entorno.

El administrador no necesita conocer coordenadas geográficas.

---

## 14. Contacto y solicitudes

Integrar Web3Forms.

Campos visibles:

- nombre;
- email;
- teléfono;
- mensaje.

Agregar automáticamente:

- ID de propiedad;
- título de propiedad.

Mostrar estados:

- enviando;
- enviado;
- error.

La solicitud también debe persistirse en PostgreSQL.

Si existe un usuario autenticado, relacionar la solicitud con él.

Los visitantes no autenticados también pueden realizar consultas.

---

## 15. Autenticación

Soportar:

- registro;
- login;
- logout;
- consulta del usuario autenticado.

Las contraseñas deben almacenarse mediante hashing seguro.

No almacenar información sensible de autenticación en `localStorage`.

---

## 16. Favoritos o propiedades interesadas

USER puede:

- guardar una propiedad;
- eliminarla de favoritos;
- listar sus propiedades guardadas.

No permitir duplicados para el mismo usuario y propiedad.

---

## 17. Cuenta de usuario

El área privada debe mostrar:

- información básica;
- propiedades interesadas;
- propiedades consultadas.

---

## 18. Dashboard administrativo

Mostrar indicadores como:

- total de propiedades;
- propiedades publicadas;
- propiedades en venta;
- propiedades en arriendo;
- usuarios;
- consultas.

---

## 19. Administración de propiedades

ADMIN puede:

- listar;
- buscar;
- crear;
- editar;
- eliminar;
- publicar/despublicar;
- destacar;
- administrar características;
- administrar imágenes.

Formulario:

- título;
- descripción;
- operación;
- tipo;
- precio;
- superficie útil;
- superficie total;
- dormitorios;
- baños;
- estacionamientos;
- antigüedad;
- dirección;
- comuna;
- ciudad;
- región;
- características;
- publicada;
- destacada.

No solicitar latitud ni longitud.

---

## 20. Administración de imágenes

ADMIN puede:

- subir;
- eliminar;
- seleccionar imagen principal;
- modificar el orden.

Al eliminar una imagen se debe mantener sincronizado Cloudinary con PostgreSQL.

No dejar referencias huérfanas.

---

## 21. Administración de usuarios

ADMIN puede:

- listar;
- buscar;
- consultar;
- activar/desactivar;
- modificar rol cuando corresponda.

La autorización siempre debe comprobarse en backend.

---

## 22. Administración de consultas

ADMIN puede revisar:

- propiedad;
- usuario asociado cuando exista;
- nombre;
- email;
- teléfono;
- mensaje;
- fecha.

Debe poder navegar desde la consulta hacia la propiedad correspondiente.

---

## 23. Responsive

La aplicación debe funcionar correctamente en:

- desktop;
- tablet;
- móvil.

Revisar especialmente:

- navegación;
- grid;
- filtros;
- tarjetas;
- galería;
- formularios;
- mapa;
- cuenta;
- administración.

---

## 24. Accesibilidad

Aplicar como mínimo:

- HTML semántico;
- labels;
- navegación mediante teclado;
- estados de foco;
- textos alternativos;
- jerarquía correcta de encabezados.

---

## 25. SEO

Las páginas públicas de propiedades deben generar metadata dinámica:

- título;
- descripción;
- Open Graph;
- imagen principal cuando corresponda.

---

## 26. Criterios de aceptación finales

El producto está funcionalmente terminado cuando:

- los visitantes pueden explorar propiedades;
- se diferencian venta y arriendo;
- funciona la búsqueda;
- funcionan filtros combinados;
- funciona el ordenamiento;
- funciona el detalle;
- funciona la galería;
- funciona Google Maps;
- funciona el contacto;
- los usuarios pueden registrarse y autenticarse;
- USER puede administrar favoritos;
- USER puede consultar propiedades contactadas;
- ADMIN puede administrar propiedades;
- ADMIN puede administrar imágenes con Cloudinary;
- ADMIN puede administrar características;
- ADMIN puede administrar usuarios;
- ADMIN puede revisar consultas;
- PostgreSQL persiste los datos;
- el frontend se comunica con el backend mediante REST;
- no se utilizan Server Actions;
- la autorización se aplica en backend;
- la aplicación es responsive;
- no existen errores bloqueantes conocidos.

---

## 27. Temas visuales (extensión)

> Extensión solicitada después de la especificación inicial. No altera los criterios de la sección 26.

El usuario puede elegir el tema de color de la interfaz desde un selector visible en el header:

- **Claro**: tema claro, con acento azul.
- **Oscuro**: tema oscuro, con acento azul.
- **Smallville**: tema oscuro inspirado en Superman. Fondo azul marino, acciones principales en rojo y detalles en azul y amarillo.

El selector los muestra en ese orden (Claro, Oscuro, Smallville). En la primera visita, sin elección guardada, se aplica Claro u Oscuro según la preferencia del sistema del usuario.

Requisitos:

- La elección se recuerda entre visitas y se aplica sin parpadeo al cargar.
- El selector es accesible (teclado, etiquetas, foco visible) y funciona en escritorio y móvil.
- Todos los temas cumplen contraste WCAG AA para texto (4.5:1) y elementos de interfaz (3:1).
- Los temas no deben requerir cambios en los componentes al añadir uno nuevo.

---

## 28. Interfaz de acceso y cuentas de ejemplo (extensión)

> Extensión solicitada después de la especificación inicial. Aplica la sección 15 en la interfaz; no altera los criterios de la sección 26.

- El header muestra un botón **Ingresar** (hacia `/login`) a los visitantes. Con sesión iniciada muestra el nombre de la persona y un botón **Cerrar sesión**. También en el menú móvil.
- `/login` permite iniciar sesión con email y contraseña; `/register` crea una cuenta USER e inicia sesión. Ambas validan con las mismas reglas que la API y muestran el mensaje de error de la API (credenciales incorrectas, cuenta desactivada, email ya registrado).
- Tras iniciar sesión o registrarse se vuelve al inicio. Quien ya tiene sesión ve un aviso en lugar del formulario.
- La sesión nunca se guarda en `localStorage`: viaja en una cookie httpOnly.
- El seed de desarrollo crea cuentas de ejemplo: un ADMIN, un USER activo y un USER desactivado, para probar el login en la interfaz, Postman y REST Client.

---

## 29. Edición de la cuenta (extensión)

> Extensión solicitada después de la especificación inicial. Complementa la sección 17 (cuenta de usuario); no altera los criterios de la sección 26.

- `/account` enlaza a una página independiente, `/account/edit`, donde la persona autenticada ve un formulario precargado con sus datos y puede actualizar su **nombre** y su **email**.
- Puede cambiar su **contraseña** indicando la actual y la nueva. Cambiar el email o la contraseña exige la contraseña actual.
- Las reglas de validación son las del registro. Un email ya usado por otra cuenta se rechaza con un mensaje claro.
- El rol y el estado de la cuenta no se pueden modificar desde aquí: el cuerpo de la solicitud nunca los acepta.
- Tras guardar, el header y la página reflejan los datos nuevos sin recargar.

---

## 30. Contador de favoritas en el navbar (extensión)

> Extensión solicitada después de la especificación inicial. Complementa la sección 16 (favoritos); no altera los criterios de la sección 26.

- Con sesión iniciada, el header (escritorio y menú móvil) muestra un enlace con un corazón y la cantidad de propiedades guardadas como favoritas, que lleva a `/account`.
- El contador se actualiza al guardar o quitar una propiedad, sin recargar. Los visitantes no lo ven.

---

## 31. Correo de las consultas desde el navegador (extensión)

> Corrección solicitada tras comprobar que Web3Forms (plan gratuito) rechaza con 403 los envíos hechos desde un servidor («Pro plan is required»). Sustituye el envío desde el backend de la sección 13 del plan.

- La consulta se guarda siempre en PostgreSQL mediante `POST /api/inquiries` (sin envío de correo en el backend).
- Después, el navegador envía el aviso por correo a Web3Forms con la clave de acceso pública `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY`. Esa clave solo permite enviar al correo con el que se registró en Web3Forms; es el uso previsto por el plan gratuito y constituye una excepción documentada a «no exponer secretos».
- Si el correo no puede enviarse, la persona ve que su consulta quedó guardada pero que no se pudo enviar el aviso.
- Las propiedades consultadas por el usuario aparecen en «Propiedades consultadas» de `/account`.

## 32. Lista compacta de consultas y eliminación (extensión)

> Solicitada por el usuario: con muchas consultas, las tarjetas dificultan localizar y eliminar registros.

- «Propiedades consultadas» de `/account` deja de mostrar tarjetas y pasa a una lista compacta, un renglón por consulta enviada: miniatura (enlace al detalle de la propiedad), título de la propiedad, asunto del correo («Nueva consulta: título»), mensaje enviado, fecha y un botón «Eliminar».
- Eliminar pide confirmación y borra solo la consulta de esa persona (404 si no existe o es de otro usuario). No afecta al correo ya enviado.
- Cada consulta aparece por separado (ya no se agrupan por propiedad).

## 33. Paginación y búsqueda de consultas (extensión)

> Solicitada por el usuario: con muchas consultas, la lista de «Propiedades consultadas» debe paginarse y poder filtrarse.

- La lista muestra 6 consultas por página, con controles Anterior/Siguiente e indicador «Página X de Y».
- Un campo de búsqueda filtra por título de la propiedad o texto del mensaje (sin distinguir mayúsculas ni acentos). Al buscar se vuelve a la página 1.
- La paginación y la búsqueda se resuelven en el backend y siempre sobre las consultas del usuario autenticado (`userId` de la sesión); nunca se ven ni gestionan consultas ajenas.
- Si al eliminar queda vacía la página actual, se retrocede a la anterior.

## 34. Confirmación visual al eliminar (extensión)

> Solicitada por el usuario: evitar eliminaciones por error con una interfaz clara.

- Al pulsar la papelera de una consulta se abre un modal (en lugar del cuadro nativo del navegador) con el título de la propiedad, el aviso «Esta acción no se puede deshacer.» y dos acciones diferenciadas: «Sí, eliminar» (peligro) y «No, cancelar».
- El foco inicia en «No, cancelar»; Esc, clic fuera o «No, cancelar» cierran sin borrar. Es accesible (`role="dialog"`, `aria-modal`, foco atrapado y devuelto al icono).

## 35. Navegación por rol y panel de administración (Paso 22)

- `/admin` es el panel de administración, exclusivo de ADMIN (el `proxy.ts` ya redirige a visitantes a `/login` y responde 403 a USER; el backend lo valida también).
- Al iniciar sesión, un ADMIN va a `/admin` salvo que llegue desde una ruta protegida (`?next=`), que se respeta. Un USER sigue yendo a la página principal o a su `next`.
- ~~Un ADMIN conserva todas las funciones de USER~~ (reemplazado por la sección 38).
- Indicadores (conteos reales desde PostgreSQL): total de propiedades, publicadas, publicadas en venta, publicadas en arriendo, usuarios y consultas.

## 36. CRUD REST de propiedades para ADMIN (Paso 23)

- Los endpoints `/api/admin/properties` son exclusivos de ADMIN (401 sin sesión, 403 para USER), también en el backend.
- **Listar** (`GET`): incluye propiedades no publicadas; paginado; admite búsqueda por texto (título, descripción, colonia, ciudad y estado, sin acentos ni mayúsculas) y filtro de estado (`all`, `published`, `draft`).
- **Crear** (`POST`, 201), **obtener** (`GET /{id}`, cualquier estado), **actualizar** (`PUT /{id}`, reemplaza los campos editables) y **eliminar** (`DELETE /{id}`, 204). 404 si la propiedad no existe.
- Campos: título, descripción, operación, tipo, precio, moneda (MXN por defecto), superficie útil y total, dormitorios, baños, estacionamientos, antigüedad, dirección, colonia, ciudad, estado, publicada y destacada. No se aceptan latitud ni longitud. La superficie útil no puede superar la total.
- Imágenes y características se administran en los Pasos 26–28, no en este paso. Eliminar una propiedad es un borrado lógico (ver §37).

## 37. Borrado lógico de propiedades (extensión)

> Solicitado por el usuario: eliminar una propiedad no debe destruir su información.

- `DELETE /api/admin/properties/{id}` marca la propiedad como eliminada (`deletedAt` con la fecha) y la despublica y desmarca como destacada; no borra ninguna fila. Responde 204.
- Una propiedad eliminada deja de aparecer en el catálogo, el detalle, las ubicaciones, los favoritos y las consultas de los usuarios, y no cuenta en los indicadores del panel. Sus imágenes, favoritos y consultas se conservan en la base de datos (y en Cloudinary).
- Para ADMIN una propiedad eliminada no existe: no se lista, y obtenerla, actualizarla o eliminarla de nuevo responde 404.
- Restaurar propiedades queda fuera de este alcance.

## 38. Área de administración independiente (extensión)

> Solicitada por el usuario: dos experiencias claramente diferenciadas, la del usuario final y la del administrador.

**Diseño**
- Las rutas `/admin/**` usan un layout propio, sin el header ni el pie del portal: barra lateral izquierda colapsable (iconos solos cuando se colapsa; en móvil es un panel que se abre desde un botón), barra superior con el nombre de la persona y «Cerrar sesión», paleta corporativa propia con una variante por cada tema del selector (Claro, Oscuro y Smallville), selector de tema en la barra superior e iconografía de gestión. El botón de colapsar la barra lateral está en la barra superior.
- Menú: Dashboard, Administrar usuarios, Administrar propiedades, Administrar consultas, Reportes y estadísticas, Configuración del sistema y Auditoría y logs. Solo el Dashboard existe hoy; los módulos aún no construidos aparecen deshabilitados con la etiqueta «Próximamente» y se activan al implementarse (Pasos 24, 29 y 30; los demás no están planificados). «Administrar usuarios» (§47) y «Administrar consultas» (§48) ya están activos.
- El Dashboard muestra los indicadores y una tabla de propiedades recientes con filtro de estado.

**Restricciones del rol ADMIN**
- Un ADMIN no usa funciones de usuario final: `/account/**` lo redirige a `/admin`; la API de favoritos y de consultas propias responde 403 a un ADMIN; el header del portal no le muestra favoritos ni «Mi cuenta» (solo «Administración» y «Cerrar sesión») y las tarjetas no le muestran el corazón de favoritos.
- Tras iniciar sesión (o cerrar sesión) el ADMIN va a `/admin` (y a `/login` al salir).
- La API de identidad (`/api/auth/me`) sigue disponible para todos los roles.

## 39. Punto de entrada según rol (extensión)

> Solicitada por el usuario.

- Al abrir `/`: un ADMIN con sesión es redirigido a `/admin`; cualquier otra persona (USER o visitante sin sesión) es redirigida a `/portal`.
- La página de inicio del portal (landing) vive en `/portal`. El enlace «Inicio», el logotipo y la salida de sesión de un USER apuntan a `/portal`.

## 40. Interfaz de administración de propiedades (Paso 24)

- `/admin/properties`: lista paginada (10 por página) de propiedades de cualquier estado, con búsqueda por texto, filtro de estado (Todas, Publicadas, Borradores), enlace «Nueva propiedad», acción «Editar» y «Eliminar» con modal de confirmación (borrado lógico, spec §34).
- `/admin/properties/new` y `/admin/properties/{id}/edit`: páginas con su cabecera, migas de pan y enlace de regreso al listado. La edición carga la propiedad (404 → mensaje «no encontrada»). El formulario de campos se construye en el Paso 25; hasta entonces ambas páginas lo anuncian.
- El módulo «Administrar propiedades» del menú lateral queda activo.

## 41. Formulario de propiedad (Paso 25)

- `/admin/properties/new` y `/admin/properties/{id}/edit` muestran el mismo formulario (React Hook Form + Zod). Secciones: información general (título, descripción, operación, tipo), precio y moneda (MXN/USD), características (superficie útil y total, dormitorios, baños, estacionamientos, antigüedad), ubicación (dirección, colonia, ciudad, estado) y publicación (publicada, destacada).
- Las reglas son las de `propertyInputSchema` (las mismas que valida la API); los campos numéricos opcionales pueden quedar vacíos. No hay latitud ni longitud manual (spec §6).
- Crear usa `POST /api/admin/properties` y editar `PUT /api/admin/properties/{id}`; al guardar vuelve al listado. Si la API responde error se muestra el mensaje sin perder lo escrito.
- Las imágenes y las etiquetas de características se administran en los Pasos 26–28, no en este formulario.

## 42. Filtros avanzados en panel lateral (extensión, Extra N)

> Solicitada por el usuario. Amplía la sección 10.

- Los filtros del catálogo siguen en un panel lateral **izquierdo** colapsable (se probó a la derecha y se revirtió por indicación del usuario) (en móvil se muestra sobre los resultados y se oculta con el botón «Ocultar filtros»).
- Filtros nuevos: **estado de la propiedad** (Disponible, Vendida, Rentada; selección múltiple) y **fecha de publicación** (desde / hasta, sobre la fecha de alta). Se suman a los existentes: rango de precio, tipo, operación, ubicación, dormitorios, baños y superficie.
- Cada propiedad tiene un estado `availability` (`AVAILABLE` por defecto, `SOLD`, `RENTED`) que el administrador elige en el formulario. Las propiedades publicadas siguen apareciendo en el catálogo sea cual sea su estado; las no disponibles muestran una etiqueta («Vendida», «Rentada»).
- Los filtros se aplican **dinámicamente**: al marcar una casilla o elegir una opción el catálogo se actualiza al momento y, al escribir en un campo, tras una breve pausa; no hay botón «Aplicar». Siguen representados en la URL (`availability=SOLD,RENTED&publishedFrom=2026-01-01&publishedTo=2026-03-31`) y se resuelven en PostgreSQL. «Limpiar filtros» los quita todos.
- API: `GET /api/properties` acepta `availability` (lista separada por comas), `publishedFrom` y `publishedTo` (`AAAA-MM-DD`, inclusivos, en UTC; 400 si el formato es inválido o `publishedFrom` > `publishedTo`).

## 43. Filtros avanzados en la administración de propiedades (extensión, Extra O)

> Solicitada por el usuario: los filtros avanzados también (y sobre todo) son para administrar propiedades.

- `/admin/properties` suma un panel de filtros **lateral derecho colapsable** (botón «Filtros» con el número de filtros activos; en pantallas estrechas se muestra bajo la barra de búsqueda).
- Filtros: rango de precio (mínimo y máximo), estado de la propiedad (Disponible, Vendida, Rentada), tipo, operación (venta/arriendo) y fecha de publicación (desde/hasta). Se combinan con la búsqueda de texto y el estado de publicación (Todas/Publicadas/Borradores) que ya existían.
- Se aplican de forma dinámica (al instante en casillas; con una breve pausa al escribir) y «Limpiar filtros» los quita todos. Al cambiar un filtro la lista vuelve a la página 1.
- API: `GET /api/admin/properties` acepta además `operation`, `type`, `availability` (listas separadas por comas), `minPrice`, `maxPrice`, `publishedFrom` y `publishedTo` con las mismas reglas que `GET /api/properties` (400 si son inválidos). El catálogo público conserva su panel izquierdo (spec §42).

## 44. Subida de imágenes a Cloudinary (Paso 26)

- `POST /api/admin/properties/{id}/images` (solo ADMIN, `multipart/form-data` con el campo `file`) sube una imagen a Cloudinary a través del backend y guarda su URL y `publicId` en PostgreSQL. Responde 201 con `{ id, url, position, isPrimary }`.
- Las imágenes se guardan en la carpeta de Cloudinary **`propiedades-claude`** (configurable con `CLOUDINARY_FOLDER`, por defecto ese valor); el `publicId` incluye la carpeta (`propiedades-claude/xxxx`).
- Validaciones: tipo JPEG, PNG o WebP (por `Content-Type` y por la firma real del archivo → 415 si no coincide) y tamaño máximo de 5 MB (413). Sin archivo, vacío o cuerpo que no sea multipart → 400. Propiedad inexistente o eliminada → 404. 401 sin sesión y 403 para un USER.
- La subida va firmada desde el servidor; el secreto de Cloudinary (`CLOUDINARY_API_SECRET`) nunca llega al navegador. Sin credenciales configuradas responde 503; si Cloudinary falla, 502.
- La primera imagen de una propiedad queda como principal; las siguientes se agregan al final (`position` consecutivo). Si falla el guardado en PostgreSQL, la imagen recién subida se elimina de Cloudinary para no dejar archivos huérfanos.
- Variables de entorno (backend): `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` y opcional `CLOUDINARY_FOLDER`.
- La interfaz para subir, eliminar, ordenar y elegir la principal es el Paso 27.

## 45. Administración de imágenes de propiedades (Paso 27)

- En `/admin/properties/{id}/edit`, bajo el formulario, hay un gestor de imágenes: subir varias a la vez (cada una sigue las reglas de §44), **eliminar**, **elegir la principal** y **reordenar** (flechas «mover antes / después»; la acción son iconos con etiqueta accesible, sin arrastrar). Tras crear una propiedad nueva se abre su edición para que se agreguen imágenes.
- API (solo ADMIN; 404 si la propiedad o la imagen no existen o no pertenecen a la propiedad):
  - `DELETE /api/admin/properties/{id}/images/{imageId}` → 204. Elimina primero la imagen de Cloudinary (acepta que ya no exista) y luego la fila de PostgreSQL; si Cloudinary falla responde 502 y no cambia nada, y repetir la operación es seguro. Si era la principal, la primera imagen restante pasa a serlo; las posiciones se compactan (0, 1, 2…).
  - `PATCH /api/admin/properties/{id}/images/{imageId}` con `{ "isPrimary": true }` → 200 con la lista actualizada. Solo hay una principal por propiedad.
  - `PUT /api/admin/properties/{id}/images` con `{ "imageIds": [...] }` → 200 con la lista en el nuevo orden; debe incluir exactamente las imágenes de la propiedad, sin repetir (400 si no). La posición de cada una pasa a ser su lugar en la lista.
- La imagen principal es la que muestran las tarjetas del catálogo; la galería del detalle sigue el orden por posición.

## 46. Administración de características (Paso 28)

- Modelo flexible (§4): el catálogo de características es la tabla `Feature` (relación muchos a muchos con `Property`); agregar una nueva es agregar una fila, nunca una columna.
- API (solo ADMIN):
  - `GET /api/admin/features` → 200 con todas las características por nombre.
  - `POST /api/admin/features` con `{ "name": "Cancha de pádel" }` → 201. El `slug` se genera del nombre (minúsculas, sin acentos, guiones). 400 si el nombre es inválido (1–60 caracteres) y 409 si ya existe una con el mismo nombre o slug (sin distinguir mayúsculas ni acentos).
  - `PUT /api/admin/properties/{id}/features` con `{ "featureIds": [...] }` → 200 con las características de la propiedad. Reemplaza el conjunto completo (puede ser vacío; los repetidos se ignoran). 400 si algún id no existe; 404 si la propiedad no existe o fue eliminada.
- En `/admin/properties/{id}/edit` hay una sección «Características» con una casilla por característica del catálogo (se guardan al marcar o desmarcar) y un campo para crear una nueva y asignarla en el momento. El detalle público ya muestra las características de la propiedad.

## 47. Administración de usuarios (Paso 29)

- API (solo ADMIN):
  - `GET /api/admin/users?page&pageSize&search&role&status` → lista paginada (10 por página, máximo 50) por fecha de alta descendente. `search` busca en nombre y email ignorando mayúsculas y acentos; `role` = `USER` | `ADMIN`; `status` = `all` (por defecto) | `active` | `inactive`. Cada usuario incluye `id`, `name`, `email`, `role`, `isActive`, `createdAt`, `favoritesCount` e `inquiriesCount`. Nunca se expone el hash de la contraseña. 400 si los parámetros son inválidos.
  - `GET /api/admin/users/{id}` → 200 con el mismo detalle; 404 si no existe.
  - `PATCH /api/admin/users/{id}` con `{ "isActive"?: boolean, "role"?: "USER" | "ADMIN" }` (al menos un campo) → 200 con el usuario actualizado; 400 si el cuerpo es inválido; 404 si no existe.
- Reglas «cuando corresponda»: un ADMIN **no puede cambiar su propio rol ni desactivarse** (403); así siempre queda al menos un ADMIN activo. Una cuenta desactivada no inicia sesión y su sesión actual deja de ser válida (§17).
- Interfaz `/admin/users` («Administrar usuarios» en el menú): buscador, filtros de rol y estado, paginación y una tabla con rol, estado, alta y consultas/favoritos. Cada fila tiene iconos para activar/desactivar (con confirmación al desactivar) y para cambiar el rol (con confirmación); en la cuenta propia se deshabilitan.

## 48. Administración de consultas (Paso 30)

- API (solo ADMIN): `GET /api/admin/inquiries?page&pageSize&search&propertyId` → lista paginada (10 por página, máximo 50), la más reciente primero. `search` busca por palabras, sin distinguir mayúsculas ni acentos, en nombre, email, mensaje y título de la propiedad; `propertyId` limita a una propiedad. 400 si los parámetros son inválidos.
- Cada consulta incluye: `id`, `createdAt`, `message`, contacto (`name`, `email`, `phone` o null), propiedad (`propertyId`, `propertyTitle`, `propertyDeleted`) y usuario asociado (`userId`, `userName`, ambos null si la envió un visitante sin sesión). Incluye consultas de propiedades despublicadas o eliminadas (borrado lógico, §37).
- Interfaz `/admin/inquiries` («Administrar consultas» en el menú): buscador, paginación y una tabla con propiedad, contacto (email y teléfono como enlaces `mailto:`/`tel:`), usuario («Visitante» si no tiene cuenta), mensaje y fecha. El título de la propiedad enlaza a `/admin/properties/{id}/edit`; si fue eliminada se muestra con la etiqueta «Eliminada» y sin enlace.
