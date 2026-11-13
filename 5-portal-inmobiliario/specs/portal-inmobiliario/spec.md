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
- Menú: Dashboard, Administrar usuarios, Administrar propiedades, Administrar consultas, Reportes y estadísticas, Configuración del sistema y Auditoría y logs. Todos los módulos del menú están construidos (ya no hay etiquetas «Próximamente»): «Administrar usuarios» (§47), «Administrar consultas» (§48), «Reportes y estadísticas» (§58), «Configuración del sistema» (§59) y «Auditoría y logs» (§60).
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

## 49. Alta de usuarios por un administrador (Extra P)

> Solicitada por el usuario: el ADMIN debe poder dar de alta cuentas, normales o de administración (el registro público solo crea USER, §17).

- API (solo ADMIN): `POST /api/admin/users` con `{ "name", "email", "password", "role"?: "USER" | "ADMIN" }` → 201 con el usuario creado (`AdminUserDto`, sin contraseña). `role` es `USER` si no se indica. Mismas reglas que el registro: nombre 2–100 caracteres, email válido (se guarda en minúsculas) y contraseña de 8 a 128. La cuenta se crea activa. 400 si el cuerpo es inválido y 409 si el email ya existe. La contraseña se guarda con el mismo hash (scrypt) que el registro y nunca se devuelve.
- Interfaz: botón «Nuevo usuario» en `/admin/users` que abre `/admin/users/new`, con un formulario (nombre, email, contraseña, rol «Usuario» o «Administrador»). Al crear vuelve al listado, que se actualiza. Los errores de la API (p. ej. email repetido) se muestran en el formulario.

## 50. SEO y metadata (Paso 31)

- Cada página pública de propiedad (`/properties/{id}`) genera su metadata en el servidor: **título** `«{título de la propiedad} | Portal Inmobiliario»`, **descripción** con tipo, operación, ubicación, precio y el inicio de la descripción (máximo 160 caracteres), y **Open Graph** (`og:title`, `og:description`, `og:type`, `og:url`, `og:site_name`, `og:locale` = `es_MX`) con la **imagen principal** (`og:image`, o la primera imagen) cuando la propiedad la tiene; con imagen se usa la tarjeta `summary_large_image` de Twitter.
- Si la propiedad no existe, no está publicada o el backend no responde, la página usa un título genérico («Propiedad no encontrada») con `robots: noindex`; la metadata nunca rompe la página.
- La consulta de metadata se hace en el servidor contra el backend (`BACKEND_URL`) mediante `@portal/api-client`, se cachea unos minutos y no expone secretos.
- El layout raíz define `metadataBase` (variable opcional `NEXT_PUBLIC_SITE_URL`, por defecto `http://localhost:3000`) y valores Open Graph por defecto para el resto de páginas. Las páginas privadas (`/account`, `/account/edit`, `/forbidden`) y toda el área `/admin` llevan `robots: noindex`.

## 51. Optimización (Paso 32)

- **Imágenes.** Todas las imágenes usan `next/image` con `sizes` ajustado a su espacio (tarjetas, galería, miniaturas, cuenta y administración) y `priority` solo en las que están a la vista al cargar. Las URLs de Cloudinary se piden ya transformadas al CDN (`f_auto,q_auto,c_limit,w_{ancho}`), de modo que el navegador nunca descarga el original (hasta 5 MB) y el servidor de Next.js no lo reprocesa. Las demás imágenes (portada local y datos de ejemplo) siguen con el optimizador de Next.js. Un cargador global no es válido: con `loader: "custom"` `/_next/image` deja de existir (404), por eso el cargador se asigna por imagen.
- **Solicitudes duplicadas.** Revisadas en el navegador (portada, catálogo y detalle): cada pantalla pide cada recurso una sola vez (SWR comparte claves, p. ej. la sesión `/api/auth/me`, y las secciones de la portada usan consultas distintas). No se requirieron cambios.
- **PostgreSQL.** Las listas ya se resuelven con `findMany` + `count` sin consultas por fila (la imagen principal se trae en la misma consulta con `take: 1`) y con índices para los filtros y órdenes del catálogo. Se agregan índices para los órdenes de administración que no los tenían: `properties(updatedAt)` (listado de administración) y `users(createdAt)` (listado de usuarios). Las búsquedas con `unaccent` + `ILIKE` resuelven los ids en SQL antes de paginar; es correcto para el volumen actual y es el punto a revisar (índice trigram) si el catálogo crece mucho.

## 52. Responsive y accesibilidad (Paso 33)

Auditoría hecha en el navegador sobre portada, catálogo, detalle, acceso, registro y todo el área `/admin` en tres anchos (escritorio 1280 px, tablet 820 px y móvil 390 px):

- **Semántica:** un solo `h1` y un solo `main` por página, sin saltos de nivel de encabezado, todos los controles con etiqueta o nombre accesible, todas las imágenes con `alt` (decorativas con `alt=""`).
- **Responsive:** ninguna página desborda horizontalmente. Corregido: en móvil la barra superior de `/admin` (texto «Panel de administración» + selector de tema + «Cerrar sesión») excedía el ancho en 10 px; el texto ahora solo se muestra desde `sm`.
- **Teclado y foco:** recorriendo cada pantalla con Tab, todo elemento enfocable muestra un indicador de foco visible. Corregido: los campos de fecha de los filtros no mostraban el anillo (el foco cae en sus segmentos internos); ahora usan `focus-within`. Quedan fuera del control de la aplicación el iframe de Google Maps y el overlay de desarrollo de Next.js.
- **Tamaño de los objetivos táctiles (WCAG 2.2, 24 px):** los enlaces «Ver todas…», «Ir al panel de administración» y las migas de pan tienen ahora una altura de acción mínima de 24 px, y las casillas de verificación de filtros y características pasan de 16 a 20 px (su etiqueta sigue siendo clicable). Los enlaces del menú ya tenían relleno vertical.

## 53. Seguridad (Paso 34)

Revisión por área, con lo verificado y lo corregido:

- **Autenticación.** Contraseñas con scrypt y comparación en tiempo constante (también cuando el email no existe); sesión en cookie `httpOnly`, `SameSite=Lax` y `Secure` en HTTPS; JWT HS256 con `AUTH_SECRET` de mínimo 32 caracteres que solo lleva el id: el rol y el estado activo se leen de la base en cada petición, así que desactivar o degradar una cuenta surte efecto de inmediato. Una cuenta desactivada no inicia sesión.
- **Autorización.** Todo endpoint `/api/admin/**` usa `withRole("ADMIN")`. Una prueba de integración descubre **todas** las rutas de administración por el sistema de archivos y exige 401 sin sesión y 403 con un USER, de modo que una ruta nueva sin protección rompe la suite. Favoritos y consultas propias son exclusivos de USER (`exact`). `proxy.ts` es solo una barrera de páginas: los datos se protegen en cada endpoint.
- **Validación REST.** Todo cuerpo y query se valida con Zod en el backend (los campos desconocidos se descartan, sin asignación masiva); las consultas SQL en bruto usan parámetros enlazados y los comodines de `LIKE` se escapan; los errores 500 no exponen detalles internos.
- **Cargas de archivos.** Solo ADMIN; tipo real por firma de bytes (JPEG/PNG/WebP, no el `Content-Type` declarado), máximo 5 MB, archivo vacío rechazado. Nuevo: se rechaza con 413 por `Content-Length` **antes** de leer el cuerpo en memoria.
- **Secretos.** Los `.env` reales no se versionan (solo los `.env.example`); el navegador solo recibe variables `NEXT_PUBLIC_*` (Google Maps, Web3Forms, URL del sitio); el JavaScript compilado del frontend no contiene `AUTH_SECRET`, `DATABASE_URL`, `CLOUDINARY_*` ni hashes.
- **Cloudinary.** Firma de subida y borrado solo en el backend, con el secreto fuera del navegador; el cargador del frontend (`res.cloudinary.com`) solo compone URLs públicas de lectura.
- **Web3Forms.** La clave pública es pública por diseño (§31) y se usa solo para el aviso por correo; la consulta se valida y guarda siempre en el backend.
- **Cabeceras.** Nuevo: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` y `Referrer-Policy` en el frontend y en la API, más `Permissions-Policy` (sin cámara, micrófono, geolocalización ni pagos) en las páginas. No se define una `Content-Security-Policy` estricta porque Next.js inyecta scripts en línea y se cargan Google Maps, Cloudinary y Web3Forms.
- **Riesgos residuales (fuera del alcance actual):** el límite de intentos de login y el rate limit (§56) viven en memoria de cada instancia (conviene un almacén compartido, p. ej. Redis, al desplegar con varias), y el registro revela si un email ya existe (409).

## 54. QA integral (Paso 35)

Recorrido de extremo a extremo contra las aplicaciones en marcha (frontend :3000 con su proxy hacia el backend :4000), con las cuentas de ejemplo del seed. Resultado: **72 de 72 comprobaciones de API correctas** y los flujos de interfaz verificados en el navegador, sin defectos bloqueantes.

- **Visitante.** Listado, filtros combinados, orden por precio, operación múltiple (`SALE,RENT`), ubicaciones y detalle (con imágenes y características). Códigos: 404 para propiedad inexistente, 400 para `operation` inválida y para rango de precio invertido, 404 al consultar una propiedad inexistente, 400 para consulta inválida. Sin sesión: 401 en favoritos, mis consultas, `/api/auth/me` y todo `/api/admin/**`; `/account` y `/admin/**` redirigen a `/login?next=…`.
- **Autenticación.** Login incorrecto 401, email inexistente 401, cuenta desactivada 403, registro con email repetido 409, datos inválidos 400, JSON roto 400; cookie `httpOnly` + `SameSite`.
- **USER.** Login, `/me`, favoritos (agregar, ver, quitar, 404 si la propiedad no existe), mis consultas y edición de perfil (cambiar el email sin contraseña actual: 403). 403 en cualquier recurso ADMIN (dashboard, propiedades, usuarios, subida de imágenes). En la interfaz, un USER que abre `/admin` ve «Acceso restringido» (403) y, tras iniciar sesión, vuelve a la ruta que pidió.
- **ADMIN.** 403 en favoritos y mis consultas (sin funciones de usuario final); dashboard; crear propiedad (201, 400 con precio negativo), despublicarla (el visitante recibe 404, el admin la ve), características (crear, asignar, 400 con id inexistente), subida de imágenes (400 sin archivo, 415 con contenido no imagen, 404 con propiedad inexistente), reordenar (400 con lista vacía), alta de usuario por API y por formulario (409 con email repetido), desactivar/activar con confirmación (Esc cancela; el usuario desactivado no inicia sesión: 403), un ADMIN no se modifica a sí mismo (403), borrado lógico de propiedad (204; repetirlo 404) y cierre de sesión (la sesión deja de ser válida).
- **Defectos encontrados y corregidos.** (1) Pruebas del diálogo de confirmación con `queryByRole("dialog")`, que nunca coincide con el `alertdialog` real y por tanto no comprobaban nada: ahora usan `alertdialog`. (2) Con las suites en paralelo, los 5 s por defecto de Vitest no alcanzaban en pruebas con scrypt y un timeout dejaba datos de prueba sin limpiar en la base de desarrollo (propiedades `*-test-*` visibles en el catálogo): el backend usa ahora 30 s de timeout y se limpiaron los restos.

## 55. Cumplimiento arquitectónico (Paso 36)

Las reglas de arquitectura de `CLAUDE.md` se verifican con una prueba automática (`apps/backend/src/architecture.test.ts`) que recorre el código fuente del monorepo:

- **Sin Server Actions:** ningún archivo contiene la directiva `"use server"`.
- **Comunicación REST:** el frontend no define Route Handlers; solo `proxy.ts` (barrera de páginas, servidor) y `lib/web3forms.ts` (navegador, spec §31) usan `fetch` fuera de `@portal/api-client`; no hay URLs absolutas a localhost en el frontend salvo valores por defecto de variables de entorno.
- **PostgreSQL única y React sin acceso a la base:** ningún workspace declara otro motor de base de datos; frontend y paquetes compartidos no dependen de Prisma ni `pg` ni importan el backend; solo `repositories/` y `lib/database/` acceden al cliente de base de datos.
- **Capas:** los Route Handlers no importan repositorios ni Prisma; los servicios no acceden a la base de datos.
- **Permisos en el backend:** todo handler de `/api/admin/**` usa `withRole("ADMIN")`; favoritos y consultas del usuario usan `withRole("USER")`; las rutas sin `withRole` son exactamente las públicas previstas (login, logout, register, `GET /auth/me`, crear consulta, ubicaciones, propiedades).
- **Integraciones y secretos:** Cloudinary (con secreto) solo en `lib/cloudinary/` del backend; Web3Forms y Google Maps solo en el frontend con claves públicas; ninguna variable `NEXT_PUBLIC_*` contiene secretos y el backend no las usa.

## 56. Límite de intentos y rate limit (Extra Q)

- **Inicio de sesión:** tras **5 intentos fallidos** (401) para un mismo email, `POST /api/auth/login` responde **429** `{ message, status }` con cabecera `Retry-After` durante **5 minutos**, incluso si la contraseña es correcta. Un inicio de sesión correcto reinicia el contador. El mensaje no revela si el email existe (se cuenta igual con emails inexistentes).
- **Rate limit por IP:** `POST /api/auth/login` y `POST /api/auth/register` aceptan como máximo **30 peticiones por minuto** por IP y `POST /api/inquiries` **10 por minuto**; el exceso responde 429 con `Retry-After`. La IP se toma de `x-forwarded-for` (primer valor) y, sin ella, se agrupa como «desconocida».
- **Implementación:** limitador en memoria del proceso (`apps/backend/src/lib/security/`), con limpieza de entradas vencidas. Limitación conocida: con varias instancias cada una cuenta por separado; para producción conviene un almacén compartido (p. ej. Redis).
- **Interfaz:** el formulario de acceso muestra el mensaje de 429 (y un mensaje flash de error).

## 57. Mensajes flash (Extra R)

- Mensajes breves (éxito, error, información) en la **parte superior de la pantalla**, sobre el header del portal y de la administración, visibles en todas las rutas porque viven en el layout raíz y sobreviven a la navegación.
- **Desaparecen solos a los 5 segundos** y tienen botón «Cerrar» (accesible por teclado). Se anuncian a lector de pantalla (`role="status"` para éxito/info, `role="alert"` para error) y respetan `prefers-reduced-motion`. Se apilan (máximo 3 visibles) y funcionan en los tres temas.
- Se muestran al: iniciar y cerrar sesión; crear usuario, cambiar rol y activar/desactivar usuarios; crear, editar y eliminar propiedades; y crear características o asignarlas a una propiedad. Los errores de esas acciones también se muestran como flash.
- La edición de nombre de una característica existente no forma parte del producto actual (no hay endpoint de renombrado); queda fuera de este Extra.

## 58. Reportes y estadísticas (Extra T)

Módulo «Reportes y estadísticas» del área de administración (§38), activo en `/admin/reports` (solo ADMIN).

- **API:** `GET /api/admin/reports` (401 sin sesión, 403 para USER) devuelve, sin paginación y sin caché (`no-store`), agregados calculados en PostgreSQL. Las propiedades eliminadas lógicamente (§37) no cuentan.
  - **Propiedades:** conteo por operación, por tipo, por estado comercial (disponible, vendida, rentada), por visibilidad (publicada/borrador) y por ciudad (las 5 con más propiedades); **precio promedio** de las publicadas por operación y moneda (no se mezclan monedas).
  - **Consultas:** total, últimos 30 días, de usuarios registrados frente a visitantes, y las 5 propiedades con más consultas.
  - **Favoritos:** total y las 5 propiedades más guardadas.
  - **Usuarios:** total, activos, desactivados y administradores.
  - **Tendencia mensual:** últimos 6 meses (incluido el actual, aunque sea 0) con propiedades creadas, consultas recibidas y usuarios registrados.
- **Interfaz:** tarjetas de resumen y gráficas de barras en HTML/CSS (sin librerías), con el valor numérico siempre visible (no depende del color), tablas y listas accesibles, estados de carga y de error con «Reintentar», y los tres temas. El Dashboard (§18) conserva sus indicadores.
- **Fuera de alcance:** exportación (CSV/PDF), rangos de fechas configurables y comparativas con periodos anteriores.

## 59. Configuración del sistema (Extra U)

Módulo «Configuración del sistema» del área de administración (§38), activo en `/admin/settings` (solo ADMIN). Los ajustes se guardan en PostgreSQL (una única fila) y tienen efecto real:

| Ajuste | Efecto |
| --- | --- |
| **Registro de cuentas** (`allowRegistration`, por defecto sí) | Si está desactivado, `POST /api/auth/register` responde **403** «El registro de cuentas está deshabilitado» y la página `/register` muestra ese aviso en lugar del formulario; el enlace «Regístrate» de la pantalla de acceso se oculta. Un ADMIN sigue pudiendo crear usuarios (§49). |
| **Moneda por defecto** (`defaultCurrency`: MXN o USD, por defecto MXN) | Moneda preseleccionada al crear una propiedad en la administración. |
| **Correo de contacto** (`contactEmail`, opcional) | Se muestra en el pie de página del portal. |
| **Teléfono de contacto** (`contactPhone`, opcional) | Se muestra en el pie de página del portal. |

- **API:** `GET /api/settings` (público: solo los ajustes anteriores, no hay secretos) y `GET`/`PUT /api/admin/settings` (solo ADMIN; 401, 403, 400 con datos inválidos). `PUT` valida con Zod (email válido, teléfono de 7 a 20 caracteres con dígitos y `+ - ( ) espacio`, cadena vacía = sin valor) y reemplaza todos los ajustes.
- **Persistencia:** tabla `system_settings` con una fila (`id = "global"`) creada con los valores por defecto la primera vez que se lee; migración incluida.
- **Interfaz:** formulario con etiquetas, validación y mensajes flash de éxito o error (§57); el pie de página y la pantalla de registro leen `GET /api/settings` con SWR, así que un cambio se ve sin esperar cachés.
- **Fuera de alcance:** nombre del sitio, tema por defecto, modo mantenimiento, límites de peticiones configurables y secretos (siguen en variables de entorno, §14).

## 60. Auditoría y logs (Extra V)

Módulo «Auditoría y logs» del área de administración (§38), activo en `/admin/audit` (solo ADMIN). Es un registro de **solo lectura y de solo adición** de lo que ocurre en el sistema, guardado en PostgreSQL (`audit_logs`).

- **Eventos registrados** (acción → categoría):
  - **Acceso** (`auth`): inicio de sesión correcto, inicio de sesión fallido (con el email intentado), cuenta bloqueada tras 5 intentos fallidos (§56), cierre de sesión y registro de una cuenta.
  - **Propiedades** (`properties`): crear, editar y eliminar.
  - **Imágenes** (`images`): subir, reordenar, cambiar la principal y eliminar.
  - **Características** (`features`): crear una característica y asignarlas a una propiedad.
  - **Usuarios** (`users`): alta por un administrador y cambios de rol o de estado.
  - **Configuración** (`settings`): guardar la configuración del sistema (§59).
- **Cada entrada** guarda: fecha y hora, acción, un resumen en español, quién la hizo (id y email en el momento del hecho, que se conservan aunque la cuenta cambie), la entidad afectada (tipo e id) y la IP de la petición. **Nunca** se guardan contraseñas, tokens, cuerpos de peticiones ni mensajes de los visitantes.
- **Cómo se registran:** las acciones de administración se registran en un solo punto, el envoltorio `withRole("ADMIN")`, cuando la petición de escritura (POST, PUT, PATCH, DELETE) tiene éxito (código < 400); una ruta de administración nueva queda auditada sin código adicional. Los eventos de acceso se registran en las rutas de `/api/auth`. Registrar es de mejor esfuerzo: un fallo al escribir el log se informa en el servidor y **nunca** hace fallar la petición.
- **API:** `GET /api/admin/audit` (401 sin sesión, 403 para USER, 400 con parámetros inválidos): paginada (20 por página, máximo 100), del más reciente al más antiguo, con filtros `category`, `search` (en el resumen y el email, sin distinguir mayúsculas), `from` y `to` (fechas `YYYY-MM-DD`, ambas inclusivas, en UTC; `from` no puede ser posterior a `to`). Sin caché.
- **Interfaz:** tabla con fecha, acción (etiqueta en español), resumen, responsable e IP; filtros por categoría, texto y fechas con aplicación dinámica y «Limpiar filtros»; paginación; estados de carga, vacío y error con «Reintentar».
- **Notas:** la IP se toma de `x-forwarded-for` (el proxy del frontend la reenvía) y se normaliza sin el prefijo `::ffff:`. Los eventos de prueba (`@example.com`) se borran al terminar la suite.
- **Fuera de alcance:** exportar, borrar o editar entradas, política de retención automática, alertas y logs de errores técnicos del servidor (siguen en la salida del proceso).

## 61. Base de datos en Supabase (Extra W)

La base de datos de la aplicación pasa de PostgreSQL local a **Supabase** (PostgreSQL administrado). PostgreSQL sigue siendo la única base de datos y Prisma el único acceso a ella (§55); Supabase se usa solo como alojamiento, **no** se usan su Data API, Auth ni Storage.

- **Conexiones:** `DATABASE_URL` es la conexión de la aplicación (pooler de Supabase) y `DIRECT_URL`, opcional, es la conexión para migraciones (`prisma migrate`), que necesita sesiones completas (conexión directa o pooler en modo sesión, puerto 5432). Si `DIRECT_URL` no existe, las migraciones usan `DATABASE_URL` (desarrollo local).
- **Usuario dedicado:** la aplicación se conecta con un usuario propio de Prisma (no con `postgres`), según la guía de Supabase.
- **Seguridad (RLS):** todas las tablas del esquema `public` tienen RLS activado, sin políticas, y se revocan los permisos de `anon` y `authenticated`. Así, aunque la Data API de Supabase esté activa, ninguna tabla (hay hashes de contraseñas) es accesible por ella; solo el backend, mediante Prisma, lee y escribe. La migración es condicional: en un PostgreSQL local sin esos roles no hace nada de más.
- **Secretos:** las cadenas de conexión viven solo en `apps/backend/.env.local` y nunca llegan al navegador (§14).
- **Datos:** las migraciones y el seed crean el esquema y las cuentas de ejemplo; si se quieren conservar los datos locales, se copian con `pg_dump`/`psql` (solo datos).
- **Pruebas:** las pruebas de integración usan la base de `DATABASE_URL` y limpian lo que crean; se recomienda ejecutarlas contra una base de desarrollo, no contra datos reales.

## 62. Paginación con parámetros en la URL (Extra X)

La paginación se resuelve siempre en el backend (PostgreSQL: `page`, `pageSize`, `total`, `totalPages`, con los mismos filtros en la consulta de datos y en la de conteo) y el frontend solo muestra la página pedida.

- **Catálogo público** (`/properties`): ya guardaba página, búsqueda y filtros en la URL y el paginador los conserva en cada enlace (§8 y §12). No cambia.
- **Listas de administración y de la cuenta** (`/admin/properties`, `/admin/users`, `/admin/inquiries`, `/admin/audit` y las consultas de `/account`): la página, la búsqueda y los filtros pasan a representarse en la URL (query params), igual que el catálogo. Cambiar de página conserva la búsqueda y los filtros; cambiar la búsqueda o un filtro vuelve a la página 1; la página 1 y los valores por defecto se omiten de la URL.
- **Efectos:** recargar la página, usar «Atrás» o compartir el enlace restauran la misma búsqueda y página. Un valor inválido en la URL (p. ej. `page=abc`) se trata como el valor por defecto.
- **Páginas inexistentes:** si la página pedida supera el total (p. ej. tras eliminar el último registro de la última página), la lista vuelve a la última página disponible.
- **Fuera de alcance:** cambiar el tamaño de página desde la interfaz y la paginación infinita.

## 63. Controles de paginación con iconos (Extra Y)

Todos los paginadores (catálogo público, listas de administración y consultas de la cuenta) usan un mismo componente con botones de icono:

- **Controles:** «Primera página», «Anterior», la numeración de páginas (1, 2, 3…), «Siguiente» y «Última página». Los controles de extremo se desactivan en la primera o la última página.
- **Numeración:** hasta 7 páginas se muestran todas; con más, se muestran la primera, la última y las vecinas de la actual, con «…» en los saltos. La página actual se marca visualmente y con `aria-current="page"`.
- **Accesibilidad:** al ser solo iconos, cada botón tiene nombre accesible («Primera página», «Anterior», «Página 3», «Siguiente», «Última página»), foco visible y área táctil mínima de 36 px; el texto «Página X de Y» queda para lectores de pantalla (`aria-live`).
- **Comportamiento:** en el catálogo los controles son enlaces que conservan búsqueda y filtros (§62); en las listas de administración y de la cuenta son botones que actualizan los parámetros de la URL. No se muestra nada si hay una sola página.
