# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev       # Vite dev server (http://localhost:5173)
npm run typecheck # tsc (strict), no emit
npm run lint      # ESLint (typescript-eslint, react-hooks, jsx-a11y)
npm run test      # Vitest (jsdom + Testing Library), single run
npm run test:watch
npm run build     # tsc + production build to dist/
npm run preview   # serve the built bundle
```

Run a single test file or test: `npx vitest run src/pages/ChatPage.test.tsx` or `npx vitest run -t "envía con Enter"`. Tests sit next to the code (`*.test.ts(x)`); `src/test/setup.ts` registers jest-dom, stubs `scrollIntoView` (missing in jsdom) and resets `localStorage` / the `dark` class after each test. Before finishing a change run `npm run lint`, `npm test` and `npm run build` (it type-checks first), and look at the running app for visual changes.

Pinned versions: TypeScript is `~6.0` because `typescript-eslint` does not support 7.x yet, and ESLint is `^9` because `eslint-plugin-jsx-a11y` does not support 10. Don't bump them without checking peer ranges.

## Project

ChatRoom (package name `chat-ui`) is a **frontend-only** chat UI: React 19 + TypeScript (strict) + Vite + Tailwind CSS v4. There is deliberately no business logic and no backend communication yet. Spring Boot (REST, WebSocket/STOMP or Socket.IO, authentication) will be integrated later, so keep components decoupled and expose integration points as props/callbacks rather than hardcoding behavior.

The React project lives at the repository root (not in a nested `chat-ui/` folder). The UI copy is in Spanish.

## Architecture

`pages/ChatPage.tsx` is a thin container: it calls `useChat()` and `useTheme()` and composes `MainLayout` (slot-based: `header`, `children`, `footer`) with presentational components. Components never own app state; only ephemeral input drafts stay local (`ConnectForm`, `ChatInput`) so typing doesn't re-render the list.

- **Folders:** `components/chat` (chat-specific), `components/layout` (`BrandLogo`, `ThemeToggle`), `components/common` (`Button`, `TextInput`, variant-based; reuse them instead of copying Tailwind classes), `hooks`, `types`, `data`, `layouts`, `pages`.
- **Hooks are the backend seam.** `useChat` composes `useConnection` (username / `isConnected`, `connect`, `disconnect`) and `useMessages(currentUser)`. They hold mock behavior today; Spring Boot (REST, WebSocket/STOMP, SSE, JWT) should replace their internals without touching components. `sendMessage` is intentionally a no-op.
- **Message model:** `Message` in `src/types/message.ts` (`id`, `sender`, ISO `sentAt`, `text`). `getMockMessages(currentUser)` in `src/data/mockMessages.ts` simulates the backend. "Own" is **derived** in `MessageList` (`message.sender === currentUser`); there is no `own` flag. Times use `Intl.DateTimeFormat`.
- **Connection flow is mock-only.** `username` (`null` = disconnected) drives the screen: disconnected renders `ConnectScreen` (centered card with branding and `ConnectForm`; empty submit shows an inline error) instead of the chat; connected renders `MainLayout` with `ChatHeader` (status badge, `UserBadge`, theme toggle, disconnect), `MessageList` and `ChatInput`. Both forms are real `<form>`s, so Enter and the button share one submit path.
- **Theme:** `src/hooks/useTheme.ts` holds dark/light, persists it in `localStorage` (`chatroom:theme:v1`), toggles the `dark` class on `<html>` and updates `<meta name="theme-color">`. An inline script in `index.html` applies the stored theme before first paint; keep its key and colors in sync with the hook. Tailwind's `dark:` variant is class-based (`@custom-variant dark` in `src/index.css`).
- **Font:** Poppins is self-hosted via `@fontsource/poppins` (latin 400/500/600, imported in `main.tsx`); there are no external font requests.
- **Tailwind v4:** no `tailwind.config.js`; plugin is `@tailwindcss/vite` and tokens live in `src/index.css`.

## Visual palette

Based on Black Dashboard React (Creative Tim). Surface/text colors are **semantic tokens** that change with the theme (`page`, `surface`, `surface-alt`, `field`, `line`, `edge`, `fg`, `muted`, `subtle`, `elevation`): define them once as CSS variables in `:root` / `:root.dark` and use `bg-surface`, `text-muted`, etc. Do not add `dark:` pairs or raw `slate-*`/hex colors for surfaces.

Brand colors: `primary`/`primary-alt` are the action gradient (`#1470e0` → `#3358f4`, white text on it is >= 4.5:1; it is slightly darker than Black Dashboard's `#1d8cf8` on purpose). Colors used as **text** are theme-aware so they keep WCAG AA on each surface: `brand` (sender names), `accent` (the user's own name), `danger` (+ `on-danger` for text on a danger background). `success` is only used for the status dot. When changing a color, verify its contrast ratio (>= 4.5:1 for text) in both themes.

## UI conventions

Icons are inline SVGs in `components/common/icons.tsx` (decorative, `aria-hidden`). Entry animation is the `animate-enter` utility (opacity/transform only; reduced motion is handled globally). Buttons share hover `scale-[1.02]` / active `scale-[0.98]` and `focus-visible` rings; never use `transition-all`. `ConnectionStatus` is the Online/Offline badge (`ok` token = AA text on its tint). Small screens: header chip and buttons collapse to icons with `sr-only` labels. Skip link lives in `App.tsx` (`#main`).

## Message list design

`MessageList` groups consecutive messages from the same sender within 5 minutes (`startsGroup`); only the first of a group shows the avatar, name and time (continuations get the time in a `title`). `Avatar` (initials, decorative) is shared with `UserBadge`.

## Skills

`.claude/skills/` holds two project skills (`vercel-react-best-practices`, `web-design-guidelines`); `.agents/skills/` and `skills-lock.json` are their source/lock. Use them when writing or reviewing React code and UI.

Catalog and activation rules for each skill are documented in the "Available Skills" and "Skills Trigger Rules" sections of `README.md`. When adding or changing a skill, update both sections so they stay in sync with `.claude/skills/`.
