# chat-ui

Chat interface (frontend only) built with React + TypeScript + Vite + Tailwind CSS v4, with an aesthetic inspired by Black Dashboard React.
There is no business logic or real connection: the backend (Spring Boot, WebSocket/STOMP) will be integrated later.

## Flow
1. Disconnected: the header shows a username field and the **Conectar** (Connect) button; the chat area shows an empty state.
2. Connected (mock): it shows "Conectado como: <name>" (Connected as), the **Desconectar** (Disconnect) button, the message list and the message input.

## Scripts
```bash
npm install
npm run dev      # development
npm run typecheck # type check (tsc)
npm run lint     # ESLint
npm run build    # type check + production build
```

Tailwind v4 is configured in `src/index.css` (`@theme`) through `@tailwindcss/vite`, so there is no `tailwind.config.js`.

## Available Skills

Catalog of the skills available in the project. They live in `.claude/skills/` (source in `.agents/skills/`, pinned versions in `skills-lock.json`).

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

### Maintenance

Whenever a skill is added, both **Available Skills** and **Skills Trigger Rules** must be updated, and its conditions must be defined so that they do not overlap with those of existing skills.
