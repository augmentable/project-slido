# Real-Time Slido Clone

> **Origin:** This repo started as a fork of [bineetNaidu/slido-clone](https://github.com/bineetNaidu/slido-clone), which used TypeGraphQL, TypeORM, and PostgreSQL with a separate Express/Apollo Server backend. It has since been rewritten to run entirely on Cloudflare's edge — replacing PostgreSQL with D1, TypeORM with Drizzle, and the standalone server with a Next.js Route Handler.

A full-stack, real-time Q&A and interactive polling application built with **Next.js**, **GraphQL Yoga**, **Drizzle ORM**, and **Cloudflare D1**. Deployable to **Cloudflare Pages** with zero Docker or Postgres dependencies.

Audience members join sessions via room codes, post questions, vote in polls, take quizzes, and complete surveys. Updates sync across all clients in real time via **WebSocket connections** through Cloudflare Durable Objects, with automatic Apollo polling fallback.

---

## Tech Stack

- **Framework:** Next.js (App Router, React 19)
- **Real-time:** Cloudflare Durable Objects (per-session WebSocket hub)
- **API:** GraphQL Yoga (served from Next.js Route Handler at `/api/graphql`)
- **ORM:** Drizzle ORM
- **Database:** Cloudflare D1 (SQLite) / better-sqlite3 for local dev
- **Styling:** Tailwind CSS 4
- **Theming:** 3 switchable themes via CSS custom properties (Night Owl / Paper / Electric)
- **Typography:** Satoshi + Cabinet Grotesk (Fontshare)
- **GraphQL Client:** Apollo Client (fallback + host operations)
- **Charts:** Recharts
- **Auth:** JWT (jsonwebtoken)
- **Testing:** Vitest + @cloudflare/vitest-pool-workers
- **Deploy:** Cloudflare Workers via @opennextjs/cloudflare

---

## Project Structure

```text
web/
├── src/
│   ├── app/
│   │   ├── globals.css                  # Theme CSS variables + animations
│   │   ├── layout.tsx                   # Root layout (ThemeProvider, fonts)
│   │   ├── page.tsx                     # Home (Join / Create / Login)
│   │   ├── api/
│   │   │   ├── graphql/route.ts         # GraphQL API endpoint
│   │   │   └── export/[sessionId]/route.ts  # CSV export
│   │   ├── docs/page.tsx                # Interactive architecture docs
│   │   └── session/[code]/
│   │       ├── page.tsx                 # Live session (Q&A, Polls, Quiz, Survey)
│   │       ├── analytics/page.tsx       # Analytics dashboard
│   │       └── present/page.tsx         # Presenter / display mode
│   ├── components/
│   │   ├── ApolloWrapper.tsx            # Apollo Client provider
│   │   ├── ThemeProvider.tsx            # React context for theme switching
│   │   ├── ThemePicker.tsx              # Swatch-based theme selector
│   │   ├── polls/                       # PollCard, PollCreator
│   │   ├── quiz/                        # QuizPlayer, QuizCreator
│   │   └── survey/                      # SurveyCard, SurveyCreator
│   ├── do/
│   │   └── SessionDO.ts                # Durable Object — per-session WebSocket hub
│   ├── hooks/
│   │   └── useSessionSocket.ts          # React hook for WS connection + fallback
│   ├── lib/
│   │   ├── apollo-client.ts             # Apollo Client setup
│   │   ├── themes.ts                    # Theme definitions + localStorage helpers
│   │   └── ws-protocol.ts              # Shared WS message types
│   ├── db/
│   │   ├── schema.ts                    # Drizzle schema (17 tables)
│   │   ├── index.ts                     # DB client factory
│   │   ├── seed.ts                      # Demo data seed (local)
│   │   └── seed-remote.ts              # Production seed via wrangler
├── scripts/
│   └── patch-worker.js                  # Post-build: injects DO export + WS routing
├── drizzle/                             # Generated SQL migrations
├── open-next.config.ts                  # @opennextjs/cloudflare adapter config
├── worker-configuration.d.ts            # CloudflareEnv type declarations
├── wrangler.toml                        # Cloudflare config (production)
├── wrangler.preview.toml                # Cloudflare config (preview branch)
├── drizzle.config.ts                    # Drizzle Kit config
├── tsconfig.json                        # TypeScript config (workers-types + node)
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js (v20+)
- npm

No Docker or PostgreSQL required.

### 1. Install Dependencies

```bash
cd web
npm install
```

### 2. Set Up Local Database

```bash
# Apply the D1 migration locally
npm run db:migrate

# Seed with demo data
npm run db:seed
```

### 3. Configure Question Titles and Admin Access

Copy `web/.env.example` to `web/.env.local` and set both variables:

```dotenv
OPENROUTER=
ADMIN_PASSWORD=
```

`OPENROUTER` is the fallback API key for title generation. An admin can override it at
runtime from **Session → Settings → Admin**; that key is stored in the `app_settings`
table and takes precedence over the environment variable.

`ADMIN_PASSWORD` seeds the admin password on the first unlock. After that the hash lives
in `app_settings.admin_password_hash` and the environment variable is no longer consulted,
so rotating it means updating that row.

### 4. Start Development Server

```bash
npm run dev
```

Open `http://localhost:3000`. Join session code `SLIDODEV` to see the demo data.

Demo host account: `host@slido.dev` / `password123`

---

## Deploy to Cloudflare Workers

### 1. Create D1 Database

```bash
npx wrangler d1 create slido-db
```

Update `wrangler.toml` with the returned `database_id`. Ensure these settings are present:

```toml
compatibility_flags = ["nodejs_compat"]   # Required for Node built-ins
main = ".open-next/worker.js"             # OpenNext build output
[assets]
directory = ".open-next/assets"
```

### 2. Apply Migrations

```bash
npm run db:migrate:prod
```

### 3. Deploy

```bash
# Production
npm run deploy

# Preview (separate worker, same D1 database)
npm run deploy:preview
```

Set the OpenRouter API key as a Wrangler secret before deploying:

```bash
npx wrangler secret put OPENROUTER
```

The build pipeline runs `@opennextjs/cloudflare build` then patches the generated worker to export the `SessionDO` class and intercept WebSocket upgrades.

---

## Features

- **Q&A** with upvoting, moderation, highlighting, replies, and sorting (popular/recent/unanswered)
- **Q&A** with short titles, up/down votes (one per person), emoji reactions, moderation, highlighting, replies, and sorting (popular/recent/unanswered)
- **Live Polls** — Multiple choice, rating, word cloud, open text, ranking
- **Quizzes** — Timed questions with speed-based scoring and leaderboards
- **Surveys** — Multi-question forms with multiple choice, rating, and open text
- **Analytics Dashboard** with engagement charts and CSV export
- **Presenter Mode** — Full-screen display for projecting live results
- **3 Switchable Themes** — Night Owl (dark), Paper (light editorial), Electric (neon charcoal)
- **User Authentication** — Email/password with JWT
- **Session Ownership** — Sessions linked to authenticated users
- **Custom Branding** — Primary color and logo per session
- **Passcode Protection** — Optional session access control

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build for production |
| `npm run build:cf` | Build for Cloudflare Workers (+ patch worker for DO) |
| `npm run preview` | Preview with Wrangler locally |
| `npm run deploy` | Build and deploy to Cloudflare (production) |
| `npm run deploy:preview` | Build and deploy preview worker |
| `npm run db:generate` | Generate new Drizzle migration |
| `npm run db:migrate` | Apply migrations locally |
| `npm run db:migrate:prod` | Apply migrations to production D1 |
| `npm run db:seed` | Seed local DB with demo data |
| `npm run db:seed:prod` | Seed production D1 via wrangler |
| `npm run test` | Run tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
