# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev       # Vite dev server (http://localhost:5173)
npm run typecheck # tsc (strict), no emit
npm run build     # tsc + production build to dist/
npm run preview   # serve the built bundle
```

There is no linter and no test runner configured, so there is no single-test command. Verify changes with `npm run build` (it type-checks first) and by looking at the running app.

## Project

ChatRoom (package name `chat-ui`) is a **frontend-only** chat UI: React 19 + TypeScript (strict) + Vite + Tailwind CSS v4. There is deliberately no business logic and no backend communication yet. Spring Boot (REST, WebSocket/STOMP or Socket.IO, authentication) will be integrated later, so keep components decoupled and expose integration points as props/callbacks rather than hardcoding behavior.

The React project lives at the repository root (not in a nested `chat-ui/` folder). The UI copy is in Spanish.

## Architecture

App state lives in `src/pages/ChatPage.tsx` (theme is in the `useTheme` hook); everything under `components/` is presentational and receives data and callbacks via props. `ChatLayout` is a slot-based shell (`header`, `children`, `footer`).

- **Connection flow is mock-only.** `username` state (`null` = disconnected) drives the whole screen: disconnected shows the username form in `ChatHeader` plus `EmptyState`; connected shows `MessageList` and `ChatInput`, which are not rendered at all otherwise. `onConnect(username)`, `onDisconnect` and `ChatInput`'s `onSend` are the future Spring Boot hooks (`handleSend` is intentionally a no-op).
- **Mock data:** `getMockMessages(currentUser)` in `src/data/mockMessages.ts` returns `Message` objects (`src/types/message.ts`: `id`, `sender`, ISO `sentAt`, `text`), simulating the backend. "Own" is **derived** in `MessageList` (`message.sender === currentUser`); there is no `own` flag in the data. Times are formatted with `Intl.DateTimeFormat`.
- **Theme:** `src/hooks/useTheme.ts` holds dark/light, persists it in `localStorage` (`chatroom:theme:v1`), toggles the `dark` class on `<html>` and updates `<meta name="theme-color">`. An inline script in `index.html` applies the stored theme before first paint; keep its key and colors in sync with the hook. Tailwind's `dark:` variant is redefined in `src/index.css` via `@custom-variant dark (&:where(.dark, .dark *))`, so it is class-based, not OS-based.
- **Tailwind v4:** there is no `tailwind.config.js`. Plugin is `@tailwindcss/vite` in `vite.config.js`; the design tokens live in the `@theme` block of `src/index.css`.

## Visual palette

Based on Black Dashboard React (Creative Tim). Tokens in `@theme` (`src/index.css`): `primary`/`primary-alt` are the action blue gradient (`#1d8cf8` → `#3358f4`), `accent` is pink (`#e14eca`, used for the user's own name), `bd-*` are dark surfaces (page `#1e1e2f`, card `#27293d`), `ld-*` are light-mode surface/text. Reuse these tokens instead of hardcoding hex values.

## Skills

`.claude/skills/` holds two project skills (`vercel-react-best-practices`, `web-design-guidelines`); `.agents/skills/` and `skills-lock.json` are their source/lock. Use them when writing or reviewing React code and UI.

Catalog and activation rules for each skill are documented in the "Available Skills" and "Skills Trigger Rules" sections of `README.md`. When adding or changing a skill, update both sections so they stay in sync with `.claude/skills/`.
