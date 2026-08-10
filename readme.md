# Real-Time Slido Clone

A full-stack, real-time Q&A and interactive polling application built with **Next.js**, **GraphQL Yoga**, **Drizzle ORM**, and **Cloudflare D1**. Deployable to **Cloudflare Pages** with zero Docker or Postgres dependencies.

Audience members join sessions via room codes, post questions, vote in polls, take quizzes, and complete surveys. Updates sync across all clients via polling.

---

## Tech Stack

- **Framework:** Next.js (App Router, React 19)
- **API:** GraphQL Yoga (served from Next.js Route Handler at `/api/graphql`)
- **ORM:** Drizzle ORM
- **Database:** Cloudflare D1 (SQLite) / better-sqlite3 for local dev
- **Styling:** Tailwind CSS 4
- **GraphQL Client:** Apollo Client
- **Charts:** Recharts
- **Auth:** JWT (jsonwebtoken)
- **Deploy:** Cloudflare Pages via @opennextjs/cloudflare

---

## Project Structure

```text
web/
├── src/
│   ├── app/
│   │   ├── page.tsx                     # Home (Join / Create / Login)
│   │   ├── api/
│   │   │   ├── graphql/route.ts         # GraphQL API endpoint
│   │   │   └── export/[sessionId]/route.ts  # CSV export
│   │   └── session/[code]/
│   │       ├── page.tsx                 # Live session (Q&A, Polls, Quiz, Survey)
│   │       ├── analytics/page.tsx       # Analytics dashboard
│   │       └── present/page.tsx         # Presenter / display mode
│   ├── components/                      # React components
│   ├── db/
│   │   ├── schema.ts                    # Drizzle schema (17 tables)
│   │   ├── index.ts                     # DB client factory
│   │   └── seed.ts                      # Demo data seed script
│   └── lib/
│       └── apollo-client.ts             # Apollo Client setup
├── drizzle/                             # Generated SQL migrations
├── wrangler.toml                        # Cloudflare config
├── drizzle.config.ts                    # Drizzle Kit config
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

### 3. Start Development Server

```bash
npm run dev
```

Open `http://localhost:3000`. Join session code `SLIDODEV` to see the demo data.

Demo host account: `host@slido.dev` / `password123`

---

## Deploy to Cloudflare Pages

### 1. Create D1 Database

```bash
npx wrangler d1 create slido-db
```

Update `wrangler.toml` with the returned `database_id`.

### 2. Apply Migrations

```bash
npm run db:migrate:prod
```

### 3. Deploy

```bash
npm run deploy
```

---

## Features

- **Q&A** with upvoting, moderation, highlighting, replies, and sorting (popular/recent/unanswered)
- **Live Polls** — Multiple choice, rating, word cloud, open text, ranking
- **Quizzes** — Timed questions with speed-based scoring and leaderboards
- **Surveys** — Multi-question forms with multiple choice, rating, and open text
- **Analytics Dashboard** with engagement charts and CSV export
- **Presenter Mode** — Full-screen display for projecting live results
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
| `npm run build:cf` | Build for Cloudflare Pages |
| `npm run preview` | Preview with Wrangler locally |
| `npm run deploy` | Build and deploy to Cloudflare |
| `npm run db:generate` | Generate new Drizzle migration |
| `npm run db:migrate` | Apply migrations locally |
| `npm run db:migrate:prod` | Apply migrations to production D1 |
| `npm run db:seed` | Seed local DB with demo data |
