# PR #1 — port handoff brief

Hands a model everything learned while porting PR #1 onto the Vite + Hono
migration, so it can review or extend the work without rediscovering it.

Everything in the prompt was established by direct inspection, not inference,
unless marked otherwise.

## Setting up

The receiving model needs the port branch, which has **not been pushed** — a clone
from GitHub will not have it. Clone the local repo in full:

```bash
git clone /Users/rob/Developer/experiment/slido-clone slido-handoff
```

Then `git checkout port/votes-reactions-titles` in the clone. Adjust the path in
the prompt to match.

## The prompt

```
You are taking over a completed-but-unpushed port in a git repository at
<PATH> (GitHub: augmentable/project-slido). Read this whole brief before
touching anything. Everything below was established by direct inspection, not
inference, unless marked otherwise.

## Situation

PR #1 (https://github.com/augmentable/project-slido/pull/1), branch
feat/votes-reactions-titles by piegunn: 2 commits (7d04871, 1618207), +5022/-1039
across 38 files. Adds auto-generated topic titles, up/down votes, reactions, a
QR/room-code rail, a settings page, and phone layouts.

The repo's default branch is master. There is no main branch — origin has only
master (a40703e), vite-migration (identical SHA), and feat/durable-objects.

PR #1 was CONFLICTING. It branched from 65020d7; master has since gained exactly
one commit, a40703e, which migrated the app from Next.js to Vite + Hono on
Cloudflare Workers and renamed or deleted every file the PR touches:

  app/page.tsx                          -> routes/Home.tsx
  app/session/[code]/page.tsx           -> routes/Session.tsx
  app/session/[code]/present/page.tsx   -> routes/Presenter.tsx
  app/session/[code]/analytics/page.tsx -> routes/Analytics.tsx
  app/docs/page.tsx                     -> routes/Docs.tsx
  app/api/graphql/route.ts              -> api/graphql.ts
  app/api/export/[sessionId]/route.ts   -> api/export.ts
  app/globals.css                       -> globals.css
  app/layout.tsx                        -> deleted (index.html + App.tsx + main.tsx)

A trial merge produced 12 conflicts. More dangerously, two files the PR ADDS
merged with no conflict at all into web/src/app/, a directory that no longer
exists on master: the auto-title API route (the PR's headline feature) and the
286-line settings page. A clean-looking merge would have shipped both as dead
code with no warning.

## What already exists

Branch port/votes-reactions-titles. The port is commit b9a826c, a merge commit
whose parents are a40703e and 1618207; the branch may carry later docs-only
commits on top, but b9a826c is the one to review. The working tree is clean and
nothing has been pushed.

Keeping that merge parentage matters: because 1618207 is reachable from b9a826c,
landing this branch on master makes GitHub mark PR #1 as merged and preserves
piegunn's authorship. A squash would break that.

### Conflict resolutions, and the reasoning behind each

- package.json — kept qrcode ^1.5.4 and @types/qrcode ^1.5.6, dropped next.
- package-lock.json — took master's, then regenerated via npm install.
- app/layout.tsx — deleted. The PR's only change to it added a viewport meta that
  index.html already carries, so nothing was lost.
- ThemePicker.tsx — deleted. The PR replaces it with a new DisplayControls
  component (theme select + A-/A+/Reset text scaling); nothing imports ThemePicker
  on the PR side.
- Analytics.tsx — now a <Navigate to={settings} replace />. The PR had replaced
  this page with a Next.js redirect() to the new settings page.
- Home.tsx — the PR MOVES the top nav bar to a centred footer rather than deleting
  it; took the PR's layout. It also removes the isModerated toggle, so
  createSession passes false — master's side referenced a state variable that no
  longer exists and would not have compiled. Kept the migration's typed catch
  (err: unknown) over the PR's `any`.
- Session.tsx — same relocation pattern; all three nav links survive (Present and a
  new Settings gear in the header, Leave at the bottom). Dropped 'use client' and
  use(params) for useParams.
- Presenter.tsx — took the PR's responsive layout and RoomCode rail. Widened the
  session type cast to cover the fields the PR's expanded query now selects
  (pollsEnabled, quizzesEnabled, saturdayBannerEnabled, and question title,
  downvoteCount, score), then dropped the PR's inline callback type annotations,
  which existed only because its data was untyped. Removed a
  @next/next/no-img-element pragma.
- Docs.tsx — kept master's Hono prose, swapped ThemePicker for DisplayControls.
- graphql.ts — kept the PR's app_settings helpers and its adminLogin,
  setOpenrouterKey, adminSettings and updateSessionFeatures resolvers, minus the
  "// -- Section --" comments the migration had deliberately stripped.
- docs/architecture.md — kept the PR's expanded documentation but corrected its
  Next.js claims to Hono, and deleted its "Hydration Strategy" section, which
  described SSR behaviour that no longer exists. Added rows for the new admin and
  feature-flag mutations.
- readme.md — kept master's build-pipeline description plus the PR's OPENROUTER
  secret instruction, and documented ADMIN_PASSWORD.

### Ported to the new architecture

- web/src/api/title.ts — the Next.js route rewritten as a Hono handler, registered
  as POST /api/title in worker.ts. Dropped next/server, the @opennextjs/cloudflare
  getCloudflareContext call, and the better-sqlite3 local-dev fallback; it now
  takes (request, d1, fallbackKey) and uses Response.json.
- web/src/routes/Settings.tsx — useParams instead of use(params), react-router
  Link, typed casts replacing @ts-ignore, registered at /session/:code/settings
  in App.tsx.
- 'use client' directives and a next/link import stripped from the PR's three new
  components (RoomCode, SaturdayBanner, DisplayControls).

### One behavioural fix beyond mechanical porting

The PR's adminLogin bootstraps the first admin from process.env.ADMIN_PASSWORD.
Under nodejs_compat at this project's compatibility_date (2024-12-01), process.env
is empty, so that comparison could never match and the settings page would have
been permanently unreachable. ADMIN_PASSWORD is now threaded from the Worker env
through the Yoga context: Ctx is { db, adminPassword: string | undefined } and
createGraphQLHandler takes (db, adminPassword), called from worker.ts with
c.env.ADMIN_PASSWORD. Verified working via a .dev.vars run (since removed).

## Verification already performed

Passing: tsc --noEmit, eslint, vite build, wrangler deploy --dry-run (bundles with
SESSION_DO / DB / ASSETS), all four of the PR's D1 migrations applying locally.

Exercised end-to-end against a local wrangler dev with seeded D1: POST /api/title
returns 400 on short input and the correct 503s both with and without a key
configured; adminLogin rejects a wrong password, accepts the env password, and
setOpenrouterKey round-trips while requireAdmin rejects a bogus token. In the
browser, Home, Session, Settings and Presenter all render with the PR's features
and zero console errors, and /session/:code/analytics redirects to /settings.

## Known gaps — these are real, do not paper over them

1. THE TEST SUITE HAS NEVER RUN GREEN HERE. vitest reports 25 failed / 7 passed on
   the port branch, all of them the DO WebSocket tests failing with
   "ReferenceError: FinalizationRegistry is not defined". Unmodified master fails
   identically (20 failed / 7 passed — the PR adds 5 more WS tests), confirmed by
   running master in a throwaway worktree against the same node_modules. So the
   port did not cause it, but the port is also not validated against a green suite.
   Suspected Node v26.7.0 against @cloudflare/vitest-pool-workers; note that npm
   blocked the postinstall scripts for workerd, better-sqlite3 and esbuild.
   Diagnosing this is the highest-value remaining work.
2. graphql.ts line 10 uses process.env.JWT_SECRET, which has the same emptiness
   problem — meaning JWT_SECRET silently falls back to 'slido-clone-dev-secret' in
   production. This is pre-existing on master and was deliberately left alone as
   out of scope. It probably deserves its own fix.
3. web/src/routes/Settings.tsx and web/src/api/title.ts are substantially rewritten
   rather than merged. They carry piegunn's logic but are not the code anyone
   reviewed on PR #1, and should be read closely.
4. The client bundle is 902 KB, past Vite's 500 KB warning.
5. seed-local.sql fails on re-run with a UNIQUE constraint on users.id.
   Pre-existing; the local D1 is already migrated and seeded.
6. The "~1060 lines" figure written into docs/architecture.md and Docs.tsx for
   graphql.ts is approximate and worth checking against the real file.

## Your job

Review the merge commit b9a826c critically — particularly the conflict resolutions
where intent was inferred from where code moved, since those are judgement calls a
reviewer could reasonably decide differently. Then take on gap 1 if you can.
Report what you find.

## Constraints

- Do not push, do not modify master, do not touch the remote or PR #1. Ask first.
- The PR author is unavailable and cannot be consulted.
- Verify anything you claim. If you change code, re-run typecheck, lint, build and
  the app itself. Never report something as verified that you did not run, and
  keep distinguishing pre-existing breakage from anything you introduce.
```
