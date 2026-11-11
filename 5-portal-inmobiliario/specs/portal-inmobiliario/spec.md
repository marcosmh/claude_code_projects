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

Presentación (extensión, sección 28 del plan): los filtros viven en un sidebar lateral izquierdo colapsable. Tipo de propiedad y operación admiten selección múltiple (checkboxes); ciudad y región son de selección única (listas desplegables con los valores existentes).

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
- Menú: Dashboard, Administrar usuarios, Administrar propiedades, Administrar consultas, Reportes y estadísticas, Configuración del sistema y Auditoría y logs. Solo el Dashboard existe hoy; los módulos aún no construidos aparecen deshabilitados con la etiqueta «Próximamente» y se activan al implementarse (Pasos 24, 29 y 30; los demás no están planificados).
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
