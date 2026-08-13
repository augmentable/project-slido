# Architecture Deep Dive

Real-Time Slido Clone — Vite + Hono + GraphQL Yoga + Durable Objects + Cloudflare D1

---

## System Overview

The app is a real-time audience interaction platform: Q&A with upvoting, live polls (5 types), timed quizzes with leaderboards, and multi-question surveys. It runs as a single Cloudflare Worker with Durable Objects for real-time WebSocket communication and D1 for persistence.

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend | Vite + React 19 | SPA with client-side routing |
| Routing | React Router v7 | Declarative client-side routes |
| Worker | Hono | Cloudflare Worker entry — API routes, WS routing, SPA fallback |
| Real-time | Durable Objects (SessionDO) | Per-session WebSocket hub with in-memory state |
| API | GraphQL Yoga | Schema-first GraphQL at `/api/graphql` (host-only ops) |
| Client | Apollo Client 4 + WebSocket | WS primary, Apollo polling fallback |
| ORM | Drizzle ORM | Type-safe schema, relational queries, migrations |
| Database | Cloudflare D1 (SQLite) | Edge-located, zero-config SQL |
| Auth | JWT (jsonwebtoken) | Stateless 7-day tokens, SHA-256 passwords |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) | Utility-first with CSS custom properties |
| Theming | CSS custom properties + React context | 3 switchable themes, persisted to localStorage |
| Typography | Satoshi + Cabinet Grotesk (Fontshare) | Loaded via Fontshare CDN |
| Charts | Recharts | Analytics dashboards and poll results |
| Testing | Vitest + @cloudflare/vitest-pool-workers | Worker-compatible test runner |

**Real-time strategy:** The app uses a **Durable Object per session** to hold WebSocket connections and broadcast state changes instantly. High-frequency audience actions (upvotes, poll responses, new questions) are applied to in-memory state and broadcast within microseconds, with D1 writes batched via alarm-based write-behind (1s debounce). Apollo polling (3s) is the automatic fallback when WebSocket is unavailable.

---

## Database Schema — 17 Tables

All tables use integer auto-increment primary keys. Foreign keys cascade on delete (except `users → sessions` which sets null). Booleans are stored as integers with Drizzle's `mode: 'boolean'` mapping. Timestamps default to `CURRENT_TIMESTAMP`.

### Entity Relationship Diagram

```
users
  └── sessions
        ├── questions
        │     ├── upvotes
        │     └── replies
        ├── polls
        │     ├── poll_options
        │     └── poll_responses
        ├── quizzes
        │     └── quiz_questions
        │           ├── quiz_options
        │           └── quiz_answers
        └── surveys
              ├── survey_questions
              │     └── survey_options
              └── survey_responses
                    └── survey_answers
```

### Table Reference

#### Core

| Table | Key Columns | Notes |
|-------|------------|-------|
| `users` | id, email (unique), password_hash, display_name | Host accounts only; audience is anonymous |
| `sessions` | id, code (unique), title, is_moderated, passcode_hash?, owner_id FK→users | Room code is the join key |

#### Q&A

| Table | Key Columns | Notes |
|-------|------------|-------|
| `questions` | id, text, author_name?, is_approved, is_highlighted, is_answered, session_id FK | Moderated sessions require approval |
| `upvotes` | id, voter_token, question_id FK | UNIQUE(voter_token, question_id) prevents double-voting |
| `replies` | id, text, author_name, question_id FK | Threaded replies from host or participants |

#### Polls

| Table | Key Columns | Notes |
|-------|------------|-------|
| `polls` | id, type, question, is_active, allow_multiple, session_id FK | Types: MULTIPLE_CHOICE, WORD_CLOUD, RATING, OPEN_TEXT, RANKING |
| `poll_options` | id, text, position, poll_id FK | Only for MC and ranking types |
| `poll_responses` | id, voter_token, poll_id FK, selected_option_id?, text_value?, rating_value?, ranking_order? | Polymorphic — nullable columns cover all 5 poll types. UNIQUE(voter_token, poll_id) |

#### Quizzes

| Table | Key Columns | Notes |
|-------|------------|-------|
| `quizzes` | id, title, is_active, current_question_index, session_id FK | Host advances questions; -1 = not started |
| `quiz_questions` | id, text, time_limit, position, correct_option_id?, quiz_id FK | Time limit in seconds (default 20) |
| `quiz_options` | id, text, position, quiz_question_id FK | 4 options per question |
| `quiz_answers` | id, voter_token, quiz_question_id FK, selected_option_id?, answered_in_ms, is_correct, score | Score = max(100, 1000 − (ms / limitMs) × 900). UNIQUE(voter_token, quiz_question_id) |

#### Surveys

| Table | Key Columns | Notes |
|-------|------------|-------|
| `surveys` | id, title, is_open, session_id FK | Multi-question forms |
| `survey_questions` | id, type, text, position, is_required, survey_id FK | Types: MULTIPLE_CHOICE, OPEN_TEXT, RATING |
| `survey_options` | id, text, position, survey_question_id FK | For MC questions |
| `survey_responses` | id, voter_token, survey_id FK, submitted_at | UNIQUE(voter_token, survey_id) |
| `survey_answers` | id, survey_response_id FK, survey_question_id FK, selected_option_id?, text_value?, rating_value? | One row per question per response |

### Key Design Decisions

- **Anonymous participation via voter tokens.** Audience members don't need accounts. A random UUID is generated client-side and stored in `localStorage`. Unique indexes on `(voter_token, entity_id)` prevent double-voting.
- **Polymorphic poll responses.** A single `poll_responses` table handles all 5 poll types through nullable columns: `selected_option_id` for MC, `rating_value` for ratings, `text_value` for word cloud / open text, and `ranking_order` (JSON string) for ranking.
- **Quiz scoring formula.** `score = max(100, 1000 − (answeredInMs / timeLimitMs) × 900)` for correct answers, 0 for incorrect. Faster correct answers earn more points, with a floor of 100.

---

## Drizzle ORM & Cloudflare D1

### DB Context in Hono

The Hono worker passes `c.env.DB` (the D1 binding) to the GraphQL handler via `createGraphQLHandler(c.env.DB)`. The Drizzle client is created per-request with `getDb(d1)`. No `better-sqlite3` fallback is needed in the worker — `wrangler dev` provides a local D1 binding natively.

### Migration Workflow

| Command | Target | What it does |
|---------|--------|-------------|
| `npm run db:generate` | — | Drizzle Kit diffs schema.ts against existing migrations, emits new .sql |
| `npm run db:migrate` | Local | `wrangler d1 migrations apply slido-db --local` |
| `npm run db:migrate:prod` | Remote D1 | `wrangler d1 migrations apply slido-db --remote` |
| `npm run db:seed` | Local | Runs seed.ts with better-sqlite3 (direct file access) |
| `npm run db:seed:prod` | Remote D1 | Generates SQL, executes via `wrangler d1 execute --remote` |

> **D1 limitation:** D1 is single-region (primary writer + read replicas). Write throughput is limited to ~100 writes/sec. For high-concurrency voting, D1 alone will bottleneck — this is a key motivator for Durable Objects.

---

## Theming System

The app ships three distinct, switchable themes controlled by CSS custom properties and React context. Themes are applied via a `data-theme` attribute on `<html>`, which scopes ~30 CSS variables defined in `globals.css`.

### Themes

| Theme | ID | Aesthetic | Key Colors |
|-------|----|-----------|------------|
| Night Owl | `nightowl` | Deep oceanic dark with warm amber accents | `#0b1222` bg, `#f59e0b` accent, `#38bdf8` accent-2 |
| Paper | `paper` | Warm cream editorial with ink and rust | `#f7f3ee` bg, `#c2410c` accent, `#a16207` accent-2 |
| Electric | `electric` | High-contrast neon on charcoal | `#18181b` bg, `#a855f7` accent, `#06b6d4` accent-2 |

### Architecture

| File | Role |
|------|------|
| `src/lib/themes.ts` | Theme types, list, localStorage get/set helpers |
| `src/components/ThemeProvider.tsx` | React context provider — reads from localStorage on mount, syncs `data-theme` attribute to `<html>` |
| `src/components/ThemePicker.tsx` | Swatch-based theme selector rendered in page headers |
| `src/globals.css` | CSS variable definitions per theme, base styles, animations (`fadeIn`, `slideUp`, `pulse-glow`) |
| `index.html` | Sets default `data-theme="nightowl"`, loads Satoshi + Cabinet Grotesk from Fontshare CDN |

---

## Request Data Flow

The app has two data paths: a **real-time WebSocket path** through Durable Objects (primary) and a **GraphQL HTTP path** (fallback + host-only operations).

### Real-Time Path (WebSocket via Durable Object)

```
Browser (WebSocket) → Hono Worker (intercepts upgrade) → SessionDO → In-Memory State → Broadcast
                                                               ↓ (write-behind)
                                                              D1
```

| Step | Layer | What happens |
|------|-------|-------------|
| 1 | React component | Session page opens. `useSessionSocket` hook connects via WebSocket to `wss://host/?code=SLIDODEV`. |
| 2 | Hono worker | Detects `Upgrade: websocket` header, resolves the DO by `env.SESSION_DO.idFromName(code)`, forwards request. |
| 3 | SessionDO.fetch | Creates WebSocket pair via `new WebSocketPair()`, calls `ctx.acceptWebSocket(server)` (Hibernation API). |
| 4 | SessionDO | Loads full session state from D1 (first access only — cached thereafter). Sends `{ type: 'state', data: {...} }` to the new client. |
| 5 | User action | Client sends `{ type: 'upvote', questionId: 42, voterToken: '...' }` over WebSocket. |
| 6 | SessionDO.webSocketMessage | Applies mutation to in-memory `cachedState` instantly (e.g. `q.upvoteCount += 1`). Queues D1 write. |
| 7 | Broadcast | Serializes cached state and sends to all connected WebSockets via `ctx.getWebSockets()`. |
| 8 | Write-behind | Alarm fires after 1s debounce. Pending SQL statements are flushed to D1 via `env.DB.batch()`. |

### GraphQL Path (HTTP — fallback + host operations)

```
React UI → Apollo Client → Hono Route → GraphQL Yoga → Drizzle ORM → D1
```

Used for: auth, session creation/branding, quiz/poll/survey authoring, moderation (approve/reject/highlight/reply), analytics, CSV export. After a GraphQL mutation succeeds, the client sends a `{ type: 'refresh' }` message to the DO, which reloads from D1 and broadcasts to all peers.

### Fallback Behavior

The `useSessionSocket` hook attempts WebSocket connection with exponential backoff (1s → 2s → 4s → ... → 30s). After 5 failed retries, it sets `fallbackToPolling = true`, which re-enables Apollo's `pollInterval: 3000`. A green dot indicator next to the room code shows the connection status (green = live WebSocket, grey = polling fallback).

---

## Durable Objects Architecture

### SessionDO (`src/do/SessionDO.ts`)

One Durable Object instance per session code. All clients viewing the same session connect to the same DO instance. The DO is the real-time coordination layer between D1 (persistent truth) and connected browsers.

**Key design decisions:**

- **Hibernation API** (`ctx.acceptWebSocket`, `webSocketMessage`, `webSocketClose`): DOs sleep between messages so idle WebSocket connections don't incur billing. On wake, the session code is restored from `ws.deserializeAttachment()` and state is reloaded from D1 if evicted.

- **In-memory hot path:** Upvotes and poll responses are applied to `cachedState` in-memory and broadcast instantly. No D1 round-trip for the read side of high-frequency mutations.

- **Write-behind batching:** Pending D1 writes are queued as `{ sql, params }` tuples and flushed via the **Alarm API** (the only timer that survives hibernation). The alarm fires after a 1-second debounce. If the flush fails, writes are re-queued for retry on the next alarm.

- **Last-client flush:** When the last WebSocket disconnects (`webSocketClose` with 0 remaining sockets), pending writes are flushed immediately to avoid data loss before the DO is evicted.

- **Immediate writes for ID-dependent operations:** `createQuestion` and `submitQuizAnswer` write to D1 synchronously because they need auto-increment IDs or `correct_option_id` verification (anti-cheat — correct answers are never sent to clients).

### Hono Worker Entry (`src/worker.ts`)

The Hono worker directly exports the `SessionDO` class — no build patch scripts needed. The worker:

1. Intercepts WebSocket upgrade requests at `/` and routes them to the correct DO instance by session code
2. Mounts the GraphQL handler at `/api/graphql`
3. Mounts the CSV export handler at `/api/export/:sessionId`
4. Falls through to static assets (Vite-built SPA in `dist/client/`)
5. Returns `index.html` for any non-API, non-asset path (SPA fallback for client-side routing)

### Deployment

Two wrangler configs enable parallel deployment of the stable and preview versions:

| Config | Worker Name | DO Support |
|--------|------------|-----------|
| `wrangler.toml` | `slido-clone` | Yes |
| `wrangler.preview.toml` | `slido-clone-preview` | Yes |

Both share the same D1 database. Each has its own independent DO namespace. Deploy with `npm run deploy` (production) or `npm run deploy:preview` (preview).

#### Build Pipeline

```
vite build (SPA → dist/client/) → wrangler deploy (bundles src/worker.ts + serves dist/client/ as assets)
```

No adapter, no patch scripts. Wrangler bundles the Hono worker directly and serves the Vite build output as static assets.

#### Wrangler Configuration

| Setting | Value | Why |
|---------|-------|-----|
| `compatibility_flags` | `["nodejs_compat"]` | GraphQL + JWT code uses Node built-ins (`crypto`, `buffer`) |
| `main` | `src/worker.ts` | Hono entry point — wrangler builds this directly |
| `[assets] directory` | `dist/client` | Vite build output |
| `[observability] enabled` | `true` | Worker tracing with 1% head sampling |
| `[limits] cpu_ms` | `300_000` | CPU time limit for long-running requests |
