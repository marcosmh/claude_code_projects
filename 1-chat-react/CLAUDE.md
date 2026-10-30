# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev       # Vite dev server (http://localhost:5173)
npm run typecheck # tsc (strict), no emit
npm run lint      # ESLint (typescript-eslint, react-hooks, jsx-a11y)
npm run build     # tsc + production build to dist/
npm run preview   # serve the built bundle
```

There is no test runner configured, so there is no single-test command. Verify changes with `npm run lint`, `npm run build` (it type-checks first) and by looking at the running app.

Pinned versions: TypeScript is `~6.0` because `typescript-eslint` does not support 7.x yet, and ESLint is `^9` because `eslint-plugin-jsx-a11y` does not support 10. Don't bump them without checking peer ranges.

## Project

ChatRoom (package name `chat-ui`) is a **frontend-only** chat UI: React 19 + TypeScript (strict) + Vite + Tailwind CSS v4. There is deliberately no business logic and no backend communication yet. Spring Boot (REST, WebSocket/STOMP or Socket.IO, authentication) will be integrated later, so keep components decoupled and expose integration points as props/callbacks rather than hardcoding behavior.

The React project lives at the repository root (not in a nested `chat-ui/` folder). The UI copy is in Spanish.

## Architecture

`pages/ChatPage.tsx` is a thin container: it calls `useChat()` and `useTheme()` and composes `MainLayout` (slot-based: `header`, `children`, `footer`) with presentational components. Components never own app state; only ephemeral input drafts stay local (`ConnectForm`, `ChatInput`) so typing doesn't re-render the list.

- **Folders:** `components/chat` (chat-specific), `components/layout` (`BrandLogo`, `ThemeToggle`), `components/common` (`Button`, `TextInput`, variant-based; reuse them instead of copying Tailwind classes), `hooks`, `types`, `data`, `layouts`, `pages`.
- **Hooks are the backend seam.** `useChat` composes `useConnection` (username / `isConnected`, `connect`, `disconnect`) and `useMessages(currentUser)`. They hold mock behavior today; Spring Boot (REST, WebSocket/STOMP, SSE, JWT) should replace their internals without touching components. `sendMessage` is intentionally a no-op.
- **Message model:** `Message` in `src/types/message.ts` (`id`, `sender`, ISO `sentAt`, `text`). `getMockMessages(currentUser)` in `src/data/mockMessages.ts` simulates the backend. "Own" is **derived** in `MessageList` (`message.sender === currentUser`); there is no `own` flag. Times use `Intl.DateTimeFormat`.
- **Connection flow is mock-only.** `username` (`null` = disconnected) drives the screen: disconnected shows `ConnectForm` (empty submit shows an inline error) plus `EmptyState`; connected shows `UserBadge`, `MessageList` and `ChatInput`, which are not rendered otherwise. Both forms are real `<form>`s, so Enter and the button share one submit path.
- **Theme:** `src/hooks/useTheme.ts` holds dark/light, persists it in `localStorage` (`chatroom:theme:v1`), toggles the `dark` class on `<html>` and updates `<meta name="theme-color">`. An inline script in `index.html` applies the stored theme before first paint; keep its key and colors in sync with the hook. Tailwind's `dark:` variant is class-based (`@custom-variant dark` in `src/index.css`).
- **Tailwind v4:** no `tailwind.config.js`; plugin is `@tailwindcss/vite` and tokens live in `src/index.css`.

## Visual palette

Based on Black Dashboard React (Creative Tim). Surface/text colors are **semantic tokens** that change with the theme (`page`, `surface`, `surface-alt`, `field`, `line`, `edge`, `fg`, `muted`, `subtle`, `elevation`): define them once as CSS variables in `:root` / `:root.dark` and use `bg-surface`, `text-muted`, etc. Do not add `dark:` pairs or raw `slate-*`/hex colors for surfaces. Brand colors are fixed: `primary`/`primary-alt` (action blue gradient `#1d8cf8` → `#3358f4`), `accent` pink (`#e14eca`, the user's own name), `success`, `danger`.

## Skills

`.claude/skills/` holds two project skills (`vercel-react-best-practices`, `web-design-guidelines`); `.agents/skills/` and `skills-lock.json` are their source/lock. Use them when writing or reviewing React code and UI.

Catalog and activation rules for each skill are documented in the "Available Skills" and "Skills Trigger Rules" sections of `README.md`. When adding or changing a skill, update both sections so they stay in sync with `.claude/skills/`.
