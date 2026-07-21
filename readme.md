# Real-Time Slido Clone

A full-stack, real-time Q&A and interactive polling application built with **TypeGraphQL**, **TypeORM**, **PostgreSQL**, and **Next.js**.

Audience members can join room sessions via custom codes, post questions, and upvote existing questions. All updates are broadcast instantly to all connected users in real time using **GraphQL WebSockets**.

---

## 🛠️ Tech Stack

### Backend (`/server`)

* **Framework / Server:** Express.js + Apollo Server (v4)
* **API Paradigm:** GraphQL (Queries, Mutations, and WebSockets Subscriptions)
* **GraphQL Framework:** TypeGraphQL (v2)
* **ORM:** TypeORM
* **Database:** PostgreSQL (running in Docker)
* **Real-time Subscriptions:** GraphQL Yoga PubSub (`@graphql-yoga/subscription`) + `graphql-ws`

### Frontend (`/web`)

* **Framework:** Next.js (App Router, React 19)
* **Language:** TypeScript
* **Styling:** Tailwind CSS
* **GraphQL Client:** Apollo Client (with Split Link for HTTP & WebSockets)

---

## 📁 Project Structure

```text
.
├── server/                   # GraphQL Backend API
│   ├── src/
│   │   ├── entities/         # TypeORM Entities & TypeGraphQL Object Types
│   │   │   ├── Question.ts
│   │   │   ├── Session.ts
│   │   │   └── Upvote.ts
│   │   ├── resolvers/        # TypeGraphQL Resolvers
│   │   │   ├── QuestionResolver.ts
│   │   │   └── SessionResolver.ts
│   │   ├── data-source.ts    # TypeORM Data Source Config
│   │   ├── pubsub.ts         # PubSub Config for Subscriptions
│   │   └── server.ts         # Server Entrypoint
│   ├── tsconfig.json
│   └── package.json
│
└── web/                      # Next.js Frontend
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx      # Landing Page (Join / Create Session)
    │   │   └── session/
    │   │       └── [code]/
    │   │           └── page.tsx # Real-Time Session Room
    │   ├── components/       # Apollo Client Wrapper & UI Components
    │   └── lib/
    │       └── apollo-client.ts # Apollo Client setup with Split Link
    └── package.json

```

---

## 🚀 Getting Started

### Prerequisites

* Node.js (v20+)
* Docker & Docker Compose (for PostgreSQL)
* npm

---

### 1. Database Setup

Run PostgreSQL using Docker Compose:

```bash
docker compose up -d

```

---

### 2. Backend Setup (`/server`)

1. Change into the server directory:

```bash
cd server

```

1. Install dependencies:

```bash
npm install

```

1. Create a `.env` file from the example:

```bash
cp .env.example .env

```

1. Start the development server:

```bash
npm run dev

```

The GraphQL endpoint and Apollo Sandbox will be available at:
`http://localhost:4000/graphql`

---

### 3. Frontend Setup (`/web`)

1. Open a new terminal and change into the web directory:

```bash
cd web

```

1. Install dependencies:

```bash
npm install

```

1. Start the Next.js development server:

```bash
npm run dev

```

1. Open `http://localhost:3000` in your browser.

---

## ⚡ Features

* **Session Management:** Create new rooms with custom room codes or join existing ones.
* **Anonymous Voting Deduplication:** Uses persistent client voter tokens in `localStorage` to allow 1 upvote per question per user.
* **Real-Time Subscriptions:** Powered by WebSockets. New questions and upvote counts sync across all connected clients instantly without polling or manual page reloads.
* **Type Safety:** end-to-end TypeScript integration with TypeORM schemas and TypeGraphQL decorators.

---

## 📜 Available Scripts

### For Backend (`/server`)

* `npm run dev` — Starts the server with `tsx watch`
* `npm run migration:generate` — Generates a new TypeORM migration file
* `npm run migration:run` — Runs pending database migrations
* `npm run migration:revert` — Reverts the last applied migration

### For Frontend (`/web`)

* `npm run dev` — Starts Next.js development server
* `npm run build` — Builds Next.js production build
* `npm run start` — Starts Next.js production server
