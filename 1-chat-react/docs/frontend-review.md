# Informe técnico del frontend (ChatRoom / chat-ui)

Fecha: 2026-10-30 · Alcance: `src/`, `index.html`, `index.css`, `vite.config.js`, `package.json` (≈ 330 líneas de código, 6 componentes, 1 página, 1 layout, 1 archivo de datos).

Metodología: lectura completa del código y aplicación de los dos skills del proyecto (ver [README.md](../README.md), secciones *Available Skills* y *Skills Trigger Rules*):

- `vercel-react-best-practices`: patrones de código y rendimiento React. Las reglas `server-*` y de Next.js no aplican (Vite solo cliente).
- `web-design-guidelines`: accesibilidad, UX y diseño. Se descargaron las reglas vigentes de `vercel-labs/web-interface-guidelines` (anexo A).

Ninguno de los dos skills cubre **decisiones de arquitectura** (capas, servicios, estado global, tipado, integración con backend). Esa parte del informe es criterio de revisión propio, no salida de un skill.

---

## 1. Hallazgos

### 1.1 Lo que ya está bien

- **El estado de teclear está localizado.** El borrador del mensaje (`ChatInput.jsx:5`) y del usuario (`ChatHeader.jsx:12`) viven en su componente, así que escribir no vuelve a renderizar `ChatPage` ni la lista (`rerender-defer-reads`).
- **Composición por slots** en `ChatLayout` (`header`, `children`, `footer`) en lugar de herencia o banderas.
- **Tokens de color centralizados** en `@theme` (`index.css:6-26`) y variante `dark` basada en clase (`index.css:3`).
- **Base de accesibilidad correcta:** `role="switch"` + `aria-checked` (`ThemeToggle.jsx:7-8`), `aria-label` en los inputs, `focus-visible:ring-*` en todos los botones, `min-w-0` + `truncate` para nombres largos (`ChatHeader.jsx:47`).
- **Estados vacío y desconectado** tratados (`EmptyState`, `ChatPage.jsx:35-37`); `preconnect` de fuentes (`index.html:6-7`); `StrictMode`.
- Sin barrel files ni componentes definidos dentro de otros (`bundle-barrel-imports`, `rerender-no-inline-components`).

### 1.2 Problemas y riesgos

Severidad: **A** alta (bug o bloquea la integración), **M** media, **B** baja.

**Arquitectura y separación de responsabilidades**

| # | Sev. | Hallazgo |
|---|------|----------|
| A1 | A | **El modelo de mensaje depende de un flag `own` y de `user: null`** (`mockMessages.js:7,10`) que `ChatPage.jsx:22` rellena con el usuario actual. Un backend real devuelve `sender`/`senderId`, no `own`. Además, si el usuario se reconecta con otro nombre, sus mensajes antiguos cambian de autor. "Propio" debe derivarse (`message.sender === currentUser`), no almacenarse. |
| A2 | A | **No existe capa de servicios.** `mockMessages` se importa directamente en la página (`ChatPage.jsx:7`). Sustituirlo por REST/WebSocket obligaría a tocar la página y los componentes. Falta una interfaz (`connect`, `disconnect`, `sendMessage`, `onMessage`, `fetchHistory`) con una implementación mock. |
| M1 | M | **`ChatPage` mezcla responsabilidades** (SRP): estado de tema, efecto sobre el DOM (`:14-16`), conexión, derivación de mensajes (`:22`) y composición de UI. Es la lógica que debe salir a hooks. |
| M2 | M | **`ChatHeader` hace demasiado** (`ChatHeader.jsx`, 83 líneas): marca/logo, indicador de estado, tema, formulario de conexión y vista de usuario conectado, con un ternario grande (`:45-79`). |
| M3 | M | **Identidad definida por el cliente.** El nombre escrito se trata como identidad. Con JWT la identidad debe salir del token validado en Spring Boot, y la UI solo mostrarla. Hay que separar "sesión/auth" de "conexión al chat". |
| M4 | M | **El estado de conexión es un booleano implícito** (`username !== null`). WebSocket/STOMP necesita `connecting`, `connected`, `reconnecting`, `error`; hoy no hay dónde representarlos. |
| B1 | B | Sin TypeScript ni tipos. En React 19 `propTypes` ya no se comprueba, así que la opción es TS (o JSDoc), no PropTypes. |
| B2 | B | Sin ESLint, sin tests y sin configuración por entorno (`VITE_API_URL`, `VITE_WS_URL`, proxy a Spring Boot). |
| B3 | B | Imports inconsistentes: `main.jsx:4` usa `./App.jsx`, `App.jsx:1` usa `./pages/ChatPage` sin extensión. |

**Componentes y duplicación**

| # | Sev. | Hallazgo |
|---|------|----------|
| M5 | M | **Clases Tailwind duplicadas**: input (`ChatHeader.jsx:69` ≈ `ChatInput.jsx:31`) y botón con degradado (`ChatHeader.jsx:74` ≈ `ChatInput.jsx:36`). Cada cambio de estilo hay que hacerlo dos veces. |
| M6 | M | **Tema claro con paleta cruda, oscuro con tokens.** El claro usa `slate-*` (`ChatHeader.jsx:24,31,47,69`, `ChatInput.jsx:22,31,41`, `MessageItem.jsx:6,15`, `ChatLayout.jsx:4`) y el oscuro `bd-*`; casi cada elemento lleva un par `x dark:y`. Faltan tokens semánticos (`surface`, `border`, `muted`) que cambien por tema una sola vez. |
| B4 | B | `--color-info` duplica `--color-primary` (`index.css:16,18`). `group` sin uso en `ThemeToggle.jsx:11`. |
| B5 | B | `ChatLayout.jsx:3-4` calcula la altura con `calc(100dvh-2rem)` / `-4rem`, acoplada a mano al padding del contenedor. Mejor `h-dvh` con padding y `min-h-0`. |
| B6 | B | Textos de interfaz fijos en JSX, sin capa de i18n; `maxLength={24}` es un número mágico (`ChatHeader.jsx:67`). |

**Rendimiento y patrones React (`vercel-react-best-practices`)**

| # | Sev. | Hallazgo |
|---|------|----------|
| A3 | A | **Scroll forzado en cada render de `ChatPage`.** `ChatPage.jsx:22` crea un array nuevo en cada render y `MessageList.jsx:7-9` lo usa como dependencia del efecto, así que `scrollIntoView` se ejecuta al cambiar el tema o al conectar, aunque no haya mensajes nuevos. Con historial real, el usuario perdería su posición de lectura (`rerender-dependencies`, `rerender-derived-state-no-effect`). |
| M7 | M | **El tema no se persiste y puede parpadear.** `useState('dark')` (`ChatPage.jsx:10`) y `class="dark"` fijo en `index.html:2`: al recargar vuelve a oscuro aunque se eligió claro. Al persistir hay que usar `localStorage` versionado (`client-localstorage-schema`), inicialización perezosa (`rerender-lazy-state-init`) y un script inline antes del primer pintado (`rendering-hydration-no-flicker`, aplicable aunque no haya SSR). |
| B7 | B | `MessageList` renderiza todos los mensajes sin límite. Con historial largo (> 50) usar `content-visibility: auto` (`rendering-content-visibility`) o virtualización. |
| B8 | B | Hoja de estilos de Google Fonts bloquea el render (`index.html:8`). Alternativa: `@fontsource/poppins` autoalojada (`rendering-resource-hints`). |

**Interfaz y accesibilidad (`web-design-guidelines`)**: ver anexo A con `archivo:línea`. Resumen: sin `aria-live` para mensajes nuevos, emojis decorativos sin `aria-hidden`, `<time>` sin `dateTime`, `transition-all` y sin `prefers-reduced-motion`, falta `color-scheme`/`theme-color`, inputs sin `name`/`spellCheck`, Enter enviando durante composición IME, textos largos sin `break-words`.

---

## 2. Recomendaciones

### 2.1 Hooks personalizados

Extraer lo que no es renderizado. Propuesta, ajustada a lo que hoy existe:

| Hook | Contenido | Origen actual |
|------|-----------|---------------|
| `useTheme()` | `theme`, `toggleTheme`, persistencia en `localStorage`, clase en `<html>` | `ChatPage.jsx:10,14-16,30` |
| `useConnection()` | `status`, `username`, `connect(name)`, `disconnect()` | `ChatPage.jsx:12,31-32` |
| `useMessages()` | lista de mensajes, historial inicial, suscripción a mensajes entrantes | `ChatPage.jsx:22` + `mockMessages` |
| `useChat()` | compone `useConnection` + `useMessages` y expone `sendMessage(text)` | `ChatPage.jsx:19` |

Dos matices frente a la idea de mover todo a hooks:

- **Eventos de teclado.** No hace falta un hook: sustituir el `onKeyDown` de `ChatInput.jsx:14-19` por un `<form onSubmit>` hace que Enter y el botón compartan un único camino, con semántica nativa y sin código de teclado. Hay que respetar la composición IME (`event.nativeEvent.isComposing`) si se mantiene el manejador.
- **Borradores de los inputs** (`draft`, `value`) deben seguir locales. Subirlos a un hook o contexto reintroduciría re-renders globales al teclear.

### 2.2 Estado

- **Mantener `useState` por ahora.** Hay tres valores simples e independientes.
- **`useReducer` cuando llegue la capa de servicios:** conexión y mensajes pasan a tener transiciones acopladas (`CONNECT_REQUESTED → CONNECTED → MESSAGE_RECEIVED / SEND_FAILED → DISCONNECTED`). Un reducer dentro de `useChat` lo hace predecible y testeable.
- **Context API:** no hoy. La profundidad de props es de 1-2 niveles. Introducir `ThemeContext` y `ChatContext` solo cuando haya consumidores lejanos (por ejemplo un panel de usuarios o una cabecera en otra ruta).
- **Zustand / Redux Toolkit:** no necesarios. Si el estado de chat crece (salas, presencia, notificaciones), Zustand es el siguiente paso natural.
- **TanStack Query:** sí para el **historial REST** (caché, reintentos, deduplicación: `client-swr-dedup`). Los mensajes en tiempo real (STOMP/SSE) no encajan en una query: se mantienen en el reducer/store y se unen al historial.

### 2.3 Preparación para Spring Boot

1. **Interfaz de servicio** `ChatService` (`connect`, `disconnect`, `sendMessage`, `subscribe`, `fetchHistory`) con `MockChatService` ahora y `StompChatService` / `SseChatService` después. `useChat` recibe la implementación por un provider, para cambiar el mock sin tocar componentes (inversión de dependencias).
2. **WebSocket/STOMP:** envolver `@stomp/stompjs` en el servicio; reconexión con backoff y estado `reconnecting` expuesto al hook. **SSE:** `EventSource` cubre solo servidor→cliente; el envío seguiría por REST `POST`.
3. **JWT:** cliente HTTP único con cabecera `Authorization`, un `useAuth` separado de la conexión, y token en memoria o cookie `httpOnly` (evitar `localStorage` para el token). Gestión de 401 y renovación en un solo sitio. El usuario mostrado viene del token, no del campo de texto.
4. **Entorno:** `VITE_API_URL` y `VITE_WS_URL`, y `server.proxy` en `vite.config.js` para evitar CORS en desarrollo.
5. **Modelo de datos:** `Message { id, sender, sentAt (ISO-8601), text }` y `User { id, username }`; `isOwn` derivado y hora formateada con `Intl.DateTimeFormat` (regla *Locale* del skill de diseño).

### 2.4 Responsabilidades por skill

| Mejora | Skill responsable |
|--------|-------------------|
| Scroll por dependencia inestable (A3), persistencia de tema con init perezoso y sin parpadeo (M7), `content-visibility` (B7), fuentes (B8), dedupe de datos con SWR/TanStack Query, hooks y derivación de estado | `vercel-react-best-practices` |
| `aria-live`, `aria-hidden`, `dateTime`, `color-scheme`, `theme-color`, `name`/`spellCheck`/placeholder, `transition-all`, `prefers-reduced-motion`, `break-words`, tamaño de zonas táctiles | `web-design-guidelines` |
| Capa de servicios, estado de conexión, JWT, TypeScript, ESLint, tests, estructura de carpetas | Ninguno: decisión de arquitectura (este informe) |

No hay solapamiento entre los dos skills en estos hallazgos. El único punto de contacto es la fuente (B8), que se asigna al de rendimiento.

---

## 3. Refactorizaciones sugeridas

1. **Partir `ChatHeader`** en `BrandLogo`, `ConnectionStatus`, `ConnectForm` (con su `draft`) y `UserBadge` (nombre + Desconectar). `ChatHeader` queda como composición.
2. **Crear `components/common/Button` y `TextInput`** con variantes (`primary`, `danger`, `outline`), por composición. Preferible a `@apply`, que oculta las clases y se resiste al cambio. Elimina M5.
3. **Tokens semánticos en `index.css`** (`--color-surface`, `--color-surface-alt`, `--color-line`, `--color-muted`, `--color-fg`) con valores distintos bajo `.dark`. Los componentes usan `bg-surface` y se eliminan casi todos los pares `dark:`. Resuelve M6.
4. **`MessageItem` recibe `message` y `isOwn`** (derivado en `MessageList` con `currentUser`). Se retira `own` de los datos (A1).
5. **`MessageList`:** efecto de scroll dependiente de `messages.length` (o del último `id`) y solo si el usuario está al final, con `aria-live="polite"` en el contenedor.
6. **`ChatInput` como `<form>`** con `name="message"`, `autoComplete="off"`.
7. **`ChatPage` como contenedor delgado:** `const chat = useChat(); const theme = useTheme();` y solo composición.
8. **Mover el mock** de `data/mockMessages.js` a `services/mock/` detrás de la interfaz `ChatService`.

---

## 4. Propuesta de estructura final

Capas por tipo (como se pidió), con el límite claro para pasar a *feature-based* cuando aparezca una segunda funcionalidad (salas, perfil, ajustes): en ese momento `components/chat`, `hooks/useChat`, `services/chat*` y `types/message` se agrupan en `features/chat/`.

```
src/
├── components/
│   ├── chat/
│   │   ├── ChatHeader.tsx
│   │   ├── ConnectForm.tsx
│   │   ├── UserBadge.tsx
│   │   ├── ConnectionStatus.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageItem.tsx
│   │   ├── ChatInput.tsx
│   │   └── EmptyState.tsx
│   ├── layout/
│   │   ├── BrandLogo.tsx
│   │   └── ThemeToggle.tsx
│   └── common/
│       ├── Button.tsx
│       └── TextInput.tsx
│
├── hooks/
│   ├── useChat.ts            # compone conexión + mensajes
│   ├── useConnection.ts
│   ├── useMessages.ts
│   ├── useTheme.ts
│   └── useAuth.ts            # fase JWT
│
├── services/
│   ├── chat.service.ts       # interfaz ChatService
│   ├── chat.mock.ts          # implementación actual (mock)
│   ├── chat.stomp.ts         # fase WebSocket/STOMP
│   └── http.ts               # cliente REST + JWT + 401
│
├── context/                  # solo si aparecen consumidores lejanos
│   └── ChatContext.tsx
│
├── types/
│   ├── user.ts
│   └── message.ts
│
├── config/
│   └── env.ts                # VITE_API_URL, VITE_WS_URL
│
├── layouts/
│   └── MainLayout.tsx        # antes ChatLayout
├── pages/
│   └── ChatPage.tsx
├── App.tsx
└── main.tsx
```

Notas: `.tsx`/`.ts` supone migrar a TypeScript (B1); puede hacerse archivo a archivo, ya que Vite admite ambos. Si se pospone, la estructura es válida con `.jsx`/`.js` y JSDoc.

---

## 5. Plan de implementación

### Fase 1 — Mejoras críticas (corrección y base de integración)
1. **A1** Modelo de mensaje sin `own`: `isOwn` derivado de `sender` y `currentUser`.
2. **A3** Efecto de scroll estable (`messages.length`) y `aria-live="polite"` en la lista.
3. **M7** `useTheme` con persistencia versionada, init perezoso y script anti-parpadeo en `index.html`; añadir `color-scheme: dark` y `<meta name="theme-color">`.
4. Correcciones rápidas de `web-design-guidelines` (anexo A): `aria-hidden` en emojis/logo, `dateTime` en `<time>`, `name` y `spellCheck={false}`, placeholder con `…` y ejemplo, `break-words`, `transition-all` → propiedades explícitas, `motion-reduce:`.

### Fase 2 — Refactorizaciones recomendadas
1. Extraer `useTheme`, `useConnection`, `useMessages`, `useChat` y adelgazar `ChatPage` (M1).
2. Partir `ChatHeader` (M2) y crear `Button` / `TextInput` (M5).
3. Tokens semánticos de color y retirada de `slate-*` (M6); eliminar `--color-info` duplicado y `group` sin uso.
4. `ChatInput` como `<form>` con soporte IME.
5. Añadir ESLint con `eslint-plugin-react-hooks` y `eslint-plugin-jsx-a11y` (automatiza buena parte de las reglas de accesibilidad) y un script `lint`.

### Fase 3 — Mejoras futuras
1. Migración incremental a TypeScript y `types/`.
2. Tests con Vitest + Testing Library (flujo conectar/desconectar, envío con Enter, derivación de `isOwn`).
3. `content-visibility` o virtualización si el historial supera ~50 mensajes; fuente autoalojada.
4. Capa de i18n si se necesita más de un idioma; `ThemeContext` si hay consumidores lejanos.

### Fase 4 — Integración con Spring Boot
1. Interfaz `ChatService` + `MockChatService`; `useChat` consume el servicio por provider.
2. `useReducer` en `useChat` con estados `disconnected | connecting | connected | reconnecting | error`.
3. `config/env.ts` y `server.proxy` en `vite.config.js`.
4. Cliente `http.ts` con JWT y manejo de 401; `useAuth` separado; la identidad pasa a venir del token.
5. Historial por REST con TanStack Query + tiempo real por STOMP (`@stomp/stompjs`) o SSE, unidos en el reducer.
6. Estados de error, carga y reconexión en la UI.

---

## Anexo A — Salida de `web-design-guidelines`

Formato terso `archivo:línea` de las reglas descargadas de `vercel-labs/web-interface-guidelines`.

## index.html

index.html:2 - `class="dark"` fijo; sin `color-scheme: dark` ni persistencia → parpadeo/scrollbars claros
index.html:5-10 - falta `<meta name="theme-color">` acorde al fondo

## src/components/ChatHeader.jsx

src/components/ChatHeader.jsx:27 - logo "C" decorativo → `aria-hidden="true"`
src/components/ChatHeader.jsx:31-36 - estado "En línea/Desconectado" cambia de forma asíncrona sin `aria-live="polite"`
src/components/ChatHeader.jsx:54 - `transition-all` → listar propiedades; sin `motion-reduce`
src/components/ChatHeader.jsx:61-68 - input sin `name`; usuario sin `spellCheck={false}`
src/components/ChatHeader.jsx:65 - placeholder sin `…` ni ejemplo ("p. ej. Anakin…")
src/components/ChatHeader.jsx:69 - `transition-all`; `focus:` en lugar de `focus-visible:` para el anillo
src/components/ChatHeader.jsx:73 - botón submit deshabilitado mientras no hay texto (la guía: habilitado hasta que empiece la petición; mostrar error en línea)
src/components/ChatHeader.jsx:74 - `transition-all`; `hover:-translate-y-px` sin variante `motion-reduce`
src/components/ChatHeader.jsx:54,74 - zona táctil ≈ 32 px de alto; sin `touch-action: manipulation`

## src/components/ChatInput.jsx

src/components/ChatInput.jsx:14-19 - Enter envía también durante composición IME; usar `<form onSubmit>` o comprobar `isComposing`
src/components/ChatInput.jsx:24-31 - input sin `name`, sin `autoComplete="off"`
src/components/ChatInput.jsx:31 - `transition-all`
src/components/ChatInput.jsx:36 - `transition-all`; sin `motion-reduce`

## src/components/EmptyState.jsx

src/components/EmptyState.jsx:5 - emoji decorativo sin `aria-hidden="true"`

## src/components/MessageItem.jsx

src/components/MessageItem.jsx:7 - nombre de usuario largo sin `truncate`/`break-words`
src/components/MessageItem.jsx:9 - `<time>` sin `dateTime`; hora fija en texto → `Intl.DateTimeFormat` sobre ISO
src/components/MessageItem.jsx:11-19 - texto largo sin `break-words` (desbordamiento con cadenas sin espacios)

## src/components/MessageList.jsx

src/components/MessageList.jsx:13 - mensajes nuevos sin `aria-live="polite"` (`role="log"`)
src/components/MessageList.jsx:14 - lista sin virtualizar ni `content-visibility` (relevante a partir de ~50)

## src/components/ThemeToggle.jsx

src/components/ThemeToggle.jsx:26 - emojis 🌙/☀️ decorativos sin `aria-hidden="true"`
src/components/ThemeToggle.jsx:17,22 - transiciones sin `motion-reduce`
src/components/ThemeToggle.jsx:11 - clase `group` sin uso

## src/layouts/ChatLayout.jsx

src/layouts/ChatLayout.jsx:4 - transición de color sin `motion-reduce`; altura con `calc()` acoplada al padding
✓ `<main>` presente; sin enlace "saltar al contenido" (mejora menor)

## src/pages/ChatPage.jsx, src/App.jsx, src/main.jsx

src/pages/ChatPage.jsx:35 - el input aparece al conectar sin mover el foco; considerar `autoFocus` solo en escritorio (con justificación)
✓ sin otros hallazgos de diseño

## src/index.css

src/index.css:28-30 - sin `color-scheme`; transición de `body` sin `prefers-reduced-motion`
✓ `focus-visible` y tokens correctos
