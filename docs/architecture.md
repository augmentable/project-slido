# Architecture Deep Dive

Real-Time Slido Clone — Next.js + GraphQL Yoga + Drizzle ORM + Cloudflare D1

---

## System Overview

The app is a real-time audience interaction platform: Q&A with upvoting, live polls (5 types), timed quizzes with leaderboards, and multi-question surveys. It runs as a single Cloudflare Pages deployment with no separate backend or WebSocket server.

| Layer | Technology | Role |
|-------|-----------|------|
| Framework | Next.js 16 (App Router) | SSR/CSR, routing, API route handler |
| API | GraphQL Yoga | Schema-first GraphQL at `/api/graphql` |
| Client | Apollo Client 4 | Query/mutation hooks with 3s poll interval |
| ORM | Drizzle ORM | Type-safe schema, relational queries, migrations |
| Database | Cloudflare D1 (SQLite) | Edge-located, zero-config SQL |
| Auth | JWT (jsonwebtoken) | Stateless 7-day tokens, SHA-256 passwords |
| Deploy | @opennextjs/cloudflare | Adapts Next.js to Cloudflare Workers |
| Styling | Tailwind CSS 4 | Utility-first with CSS custom properties |

**Current real-time strategy:** The app uses Apollo Client polling (3-second interval) instead of WebSocket subscriptions. Every connected client re-fetches the full session query on a timer. This works for small audiences but does not scale — see [Durable Objects Migration](#migration-to-durable-objects--real-time) for the path forward.

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

### Why Drizzle + D1

Drizzle ORM provides type-safe schema definitions, relational queries (similar to Prisma's `include`), and migration generation — all in a package that runs natively in Cloudflare Workers without Node.js polyfills. D1 is Cloudflare's edge SQLite database, co-located with the Workers that query it.

### Schema Definition Pattern

Every table is defined with `sqliteTable()` from `drizzle-orm/sqlite-core`. Booleans use `integer('col', { mode: 'boolean' })` since SQLite has no native boolean. Relations are declared separately with `relations()` for Drizzle's relational query builder — they don't affect the SQL schema but enable nested `with:` queries.

### Database Client Factory

The DB layer (`src/db/index.ts`) is a minimal wrapper:

```typescript
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export function getDb(d1: D1Database) {
  return drizzle(d1, { schema });
}
```

### Dual-Mode DB Context

The GraphQL route handler resolves the database at runtime:

- **On Cloudflare:** reads the D1 binding from `getCloudflareContext().env.DB`
- **In local dev:** falls back to `better-sqlite3` against the `.wrangler/state/` SQLite file

This lets the same codebase run on both platforms without conditional imports at the schema level.

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

## GraphQL API Layer

### Architecture

The API is a single Next.js Route Handler at `/api/graphql` that delegates to GraphQL Yoga. Yoga is configured schema-first — the SDL and resolvers are co-located in `route.ts` (~860 lines). The schema exports both GET and POST handlers.

On each request, Yoga's context factory calls `getDbFromContext()` to resolve the Drizzle instance. There is no DataLoader or batching layer — each resolver makes direct Drizzle queries.

### Queries (9)

| Query | Arguments | Returns | Purpose |
|-------|-----------|---------|---------|
| `me` | token | User? | Verify JWT, return authenticated user |
| `checkSession` | code | SessionCheck! | Lightweight exists + passcode check |
| `session` | code, passcode? | Session? | Full session with nested Q&A, polls, quizzes, surveys |
| `pendingQuestions` | sessionId | [Question!]! | Unapproved questions for moderation queue |
| `poll` | pollId | Poll? | Single poll with options and responses |
| `quiz` | quizId | Quiz? | Quiz with ordered questions and options |
| `quizLeaderboard` | quizId | [LeaderboardEntry!]! | Aggregated scores grouped by voter |
| `survey` | surveyId | Survey? | Survey with ordered questions |
| `sessionAnalytics` | sessionId | SessionAnalytics! | Aggregate counts across all activity |

### Mutations (15 operations)

| Mutation | Purpose |
|----------|---------|
| `register` / `login` | Email/password auth, returns JWT + user |
| `createSession` | New session with optional passcode and owner binding |
| `updateSessionBranding` | Set primary color and logo URL |
| `createQuestion` | Post question (auto-approved unless moderated) |
| `approveQuestion` / `rejectQuestion` | Moderation actions |
| `highlightQuestion` / `markAsAnswered` | Host curation controls |
| `replyToQuestion` | Threaded reply from host or participant |
| `upvoteQuestion` | Idempotent upvote (one per voter_token) |
| `createPoll` / `activatePoll` / `deactivatePoll` | Poll lifecycle |
| `submitPollResponse` | MC, rating, word cloud, ranking, or open text |
| `createQuiz` / `addQuizQuestion` | Quiz authoring with correct answer |
| `startQuiz` / `nextQuizQuestion` | Host-driven quiz progression |
| `submitQuizAnswer` | Timed answer with speed-based scoring |
| `createSurvey` / `addSurveyQuestion` | Multi-question form builder |
| `submitSurveyResponse` / `closeSurvey` | Batch answer submission, close survey |

### Field Resolvers

| Type | Field | Implementation |
|------|-------|---------------|
| Question | upvoteCount | `COUNT(*)` from upvotes per question |
| Question | replies | Returns eager-loaded array, or falls back to query |
| Poll | responseCount | `COUNT(*)` from poll_responses per poll |
| PollOption | voteCount | `COUNT(*)` from poll_responses per option |
| PollResponse | rankingOrder | `JSON.parse()` of the stored string |
| Survey | responseCount | `COUNT(*)` from survey_responses per survey |

> **N+1 pattern:** The `upvoteCount` and `voteCount` field resolvers execute a COUNT query per item. For a session with 50 questions, the session query triggers ~50 additional COUNT queries. Acceptable at current scale but would benefit from a DataLoader or pre-aggregation at growth.

---

## Request Data Flow

```
React UI → Apollo Client → Next.js Route → GraphQL Yoga → Drizzle ORM → Cloudflare D1
```

### Example: submitting a question

| Step | Layer | What happens |
|------|-------|-------------|
| 1 | React component | User types question, clicks Ask. Component calls `createQuestion` via `useMutation`. |
| 2 | Apollo Client | Serializes the GQL operation as POST to `/api/graphql`. HttpLink uses relative URL. |
| 3 | Next.js Route Handler | The POST export in `route.ts` passes the Request to Yoga's `handle()`. |
| 4 | GraphQL Yoga | Parses the operation, resolves context (`getDbFromContext`), dispatches to resolver. |
| 5 | Resolver logic | Validates input (trim, length limits), checks session exists, checks moderation, inserts. |
| 6 | Drizzle ORM | Translates `.insert().values().returning()` into parameterized `INSERT ... RETURNING`. |
| 7 | Cloudflare D1 | Executes SQL against edge SQLite. Returns inserted row. |
| 8 | Response path | Row flows back through Drizzle → resolver → Yoga → Next.js → Apollo. `onCompleted` triggers refetch. |

### Polling-Based Updates

The session page uses Apollo's `pollInterval: 3000` — every 3 seconds, every connected client re-fetches the entire `GetSessionDetails` query (all questions with replies, all polls with options, all quizzes, all surveys). The moderation queue polls at 5 seconds.

| Metric | Value |
|--------|-------|
| Session poll interval | 3 seconds |
| Moderation poll interval | 5 seconds |
| Typical response size | ~6KB |

> **Scaling ceiling:** With 100 concurrent users, this produces ~33 GraphQL requests/sec. Each query joins across 5+ tables with nested relations. D1's read throughput handles this, but 500+ users would saturate the connection and increase latency.

---

## Migration to Durable Objects & Real-Time

Durable Objects (DOs) are Cloudflare's solution for stateful, single-threaded, globally addressable actors. Each DO instance has its own transactional SQLite storage and can hold WebSocket connections — ideal for per-session state coordination.

### Target Architecture

```
Browser (WebSocket) → Worker (Router) → Session DO → D1 (Persistence)
```

One Durable Object per session code. All clients for a session (e.g. SLIDODEV) connect to the same DO instance. The DO holds WebSocket connections and broadcasts mutations to all connected peers instantly.

### Phase 1: Session Durable Object

Create a `SessionDO` class keyed by session code. It accepts WebSocket upgrades via the Hibernation API (`acceptWebSocket` + `webSocketMessage` / `webSocketClose`). On first access, it loads the session from D1 into in-memory state. Subsequent reads are served from memory — no D1 round-trip.

**wrangler.toml changes:** Add a `[[durable_objects.bindings]]` block pointing to the SessionDO class, plus a `[[migrations]]` block for the DO's SQLite storage.

### Phase 2: WebSocket Protocol

**Client-side:** Replace Apollo polling with a WebSocket connection. On session page load, open a WebSocket to `/api/ws?code=SLIDODEV`. The Worker routes this to the correct DO via `env.SESSION_DO.get(id)`. The DO upgrades the connection and adds it to its connected-clients set.

| Direction | Type | Payload |
|-----------|------|---------|
| Client → DO | mutation | `{ action: 'upvote', questionId, voterToken }` |
| DO → All clients | broadcast | `{ type: 'questionUpdated', question: {...} }` |
| DO → All clients | broadcast | `{ type: 'pollResponseAdded', pollId, counts: {...} }` |
| DO → Client | ack | `{ requestId, success: true }` |
| DO → Client | error | `{ requestId, error: 'Already voted' }` |

### Phase 3: In-Memory State + D1 Write-Behind

**Hot path (in DO memory):** Upvotes, poll responses, and quiz answers are applied to in-memory session state immediately and broadcast to all WebSocket clients within milliseconds. The DO batches writes to D1 on a 1-second debounced timer — or on `webSocketClose` / alarm.

**Cold path (D1 via GraphQL):** Session creation, quiz authoring, survey creation, and analytics remain as GraphQL mutations hitting D1 directly. These are low-frequency, host-only operations that don't need real-time broadcast.

### Phase 4: Hibernation & Cost Optimization

Use the Hibernation API so DOs don't bill for idle WebSocket connections. The DO sleeps between messages — Cloudflare wakes it on incoming WebSocket frames. State is evicted from memory during hibernation; on wake, reload from the DO's embedded SQLite or D1. Set an alarm to flush pending writes before hibernation.

### What Changes in the Codebase

| File / Area | Current | After DOs |
|------------|---------|-----------|
| `wrangler.toml` | D1 binding only | + DO binding + DO migration tag |
| `src/do/SessionDO.ts` | Does not exist | DO class with WS handling |
| `api/ws/route.ts` | Does not exist | Upgrades to WS, routes to DO |
| `session/[code]/page.tsx` | Apollo `pollInterval: 3000` | WS connection, dispatch/receive |
| `api/graphql/route.ts` | All mutations write to D1 | High-freq mutations route through DO |
| `apollo-client.ts` | HttpLink only | Keep for auth/session-creation; add WS for live data |

### What Stays the Same

- The Drizzle schema and D1 database remain the source of truth for all persistent data.
- GraphQL continues to serve session creation, auth, analytics, and CSV export.
- The React component tree and UI remain unchanged — only the data-fetching hooks change.

> **Estimated effort:** Phase 1–2 (basic DO + WebSocket) can be implemented in a focused sprint. The existing GraphQL resolvers contain all the business logic (validation, scoring, deduplication) that can be extracted into shared functions called by both the DO message handler and the remaining GraphQL mutations.
