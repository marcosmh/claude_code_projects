# chat-ui

Chat client built with React + TypeScript + Vite + Tailwind CSS v4, with an aesthetic inspired by Black Dashboard React.
It talks to the Spring Boot backend in `../2-chat-backend` over REST (history, connected users) and WebSocket + STOMP (real-time messages and presence). There is no authentication yet.

## Flow
1. Disconnected: a centered card asks for a username with the **Conectar** (Connect) button. The server can reject the name (e.g. already in use) and the error is shown on the card.
2. Connected: "Conectado como <name>", the **Desconectar** (Disconnect) button, an Online badge with the number of users online, the message history loaded from the backend, live messages from other users, "se unió / salió" notices and the message input. If the connection drops it reconnects automatically.

## Configuration
The backend URLs are read from environment variables (see `.env.example`; put overrides in `.env.local`):

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8080` | REST base URL |
| `VITE_WS_URL` | `VITE_API_URL` with `ws://` + `/ws` | WebSocket/STOMP endpoint |

## Run with the backend
```bash
cd ../2-chat-backend && ./mvnw -DskipTests spring-boot:run   # http://localhost:8080
npm install && npm run dev                                    # http://localhost:5173
```
Open the app in two browser windows with different usernames to see messages and presence in real time. The backend allows the origin `http://localhost:5173` (property `app.cors.allowed-origins`).

## Scripts
```bash
npm install
npm run dev      # development
npm run typecheck # type check (tsc)
npm run lint     # ESLint
npm test         # unit/component tests (Vitest)
npm run build    # type check + production build
```

Tailwind v4 is configured in `src/index.css` (`@theme`) through `@tailwindcss/vite`, so there is no `tailwind.config.js`.

## Available Skills

Catalog of the skills available in the project. They live in `.claude/skills/`. The two Vercel skills have their source in `.agents/skills/` and pinned versions in `skills-lock.json`; `spring-boot-best-practices` is authored directly in `.claude/skills/`.

### vercel-react-best-practices

- **Functional description:** React/Next.js performance optimization guide maintained by Vercel. It contains 70 rules in 8 categories ordered by impact (`async-`, `bundle-`, `server-`, `client-`, `rerender-`, `rendering-`, `js-`, `advanced-`), with examples in `rules/`.
- **Main goal:** make new or refactored React code follow proven performance patterns.
- **Responsibilities:** guide the writing and review of components, data fetching, bundle size, re-renders and JavaScript performance.
- **Common use cases:** creating new components, reviewing a slow component, reducing re-renders, optimizing imports and module loading, preparing data integration (REST/WebSocket) without request waterfalls.

### web-design-guidelines

- **Functional description:** reviews UI code against Vercel's Web Interface Guidelines. It downloads the latest rules from `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md` on every review.
- **Main goal:** detect accessibility, UX and design violations in the UI.
- **Responsibilities:** read the specified files, apply all the rules and return findings in a terse `file:line` format.
- **Common use cases:** auditing accessibility, reviewing the UX/design of a component or page, checking the UI before integrating the backend.

### spring-boot-best-practices

- **Functional description:** guide for generating and evolving Spring Boot projects (Java 25, Maven, Spring Boot 4.x) with a layered architecture: controllers, services, repositories, models, DTO records and explicit mappers, plus a `config/` package for all Spring and Spring Security configuration. It also covers Spring MVC + Thymeleaf + Tailwind monoliths.
- **Contents:** `SKILL.md` (rules and workflow), `references/` (`pom-template.md`, `project-structure.md`, `layer-templates.md`, `patterns.md`, `config-security.md`, `websocket-stomp.md`, `thymeleaf-web.md`) loaded on demand, and `evals/evals.json` (5 test cases with assertions).
- **Main goal:** keep every Spring Boot layer with a single responsibility and a consistent project baseline (Maven Wrapper, `application.properties`, base package from the workspace name).
- **Responsibilities:** generate the project baseline, entities, repositories, services, controllers, DTOs and mappers, and review or refactor Spring Boot architecture.
- **Common use cases:** creating a Spring Boot API or project from scratch, adding entities and REST endpoints, refactoring layers, building a server-rendered web app. Likely to be used when the Spring Boot backend for this chat is started.

## Skills Trigger Rules

### vercel-react-best-practices

- **When to run it:** when writing, reviewing or refactoring React components, when implementing data fetching, or when optimizing bundle size and load times.
- **Events or actions that trigger it:** tasks on components (`src/components/`, `src/pages/`, `src/layouts/`), requests such as "optimize", "refactor" or "review performance", and the future data layer with Spring Boot.
- **When not to use it:** for styling or visual design (use `web-design-guidelines`), for text or configuration changes without React code, or for the `server-*` and Next.js rules: this project is Vite client-only and does not need them.
- **Dependencies or prerequisites:** none external; the rules are stored locally.

### web-design-guidelines

- **When to run it:** when a review of the interface, accessibility, UX or design is requested, for example "review my UI", "check accessibility", "audit design".
- **Events or actions that trigger it:** an explicit UI review request with a file or pattern (`<file-or-pattern>`); if none is given, it asks which files to review.
- **When not to use it:** for performance optimization or React patterns (use `vercel-react-best-practices`), or for writing new components from scratch.
- **Dependencies or prerequisites:** internet access to download the rules on every review.

### spring-boot-best-practices

- **When to run it:** when creating a Spring Boot API or a monolithic Spring Web application, generating a Spring Boot project from scratch, creating or modifying entities, repositories, services or controllers, adding REST endpoints, configuring Spring beans, Spring Security, JWT, CORS or application properties, building real-time features with WebSocket/STOMP, or refactoring a Spring Boot architecture.
- **Events or actions that trigger it:** phrases such as "create spring boot api", "generate spring boot project", "create entity", "add repository", "add service", "add controller", "create endpoint", "spring mvc", "thymeleaf", "modify entity", "modify service", "refactor spring boot" and "spring web monolith", "spring security", "configure cors", "add config", "websocket", "stomp" and "real-time chat".
- **When not to use it:** for the React frontend (use `vercel-react-best-practices` or `web-design-guidelines`), or for non-Spring Java code.
- **Dependencies or prerequisites:** JDK 25, internet access to verify the Spring Boot version and to use Spring Initializr (falls back to a hand-written `pom.xml`).

### Maintenance

Whenever a skill is added, both **Available Skills** and **Skills Trigger Rules** must be updated, and its conditions must be defined so that they do not overlap with those of existing skills.
