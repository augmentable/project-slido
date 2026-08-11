'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ThemePicker } from '@/components/ThemePicker';
import { useTheme } from '@/components/ThemeProvider';

type Section = 'overview' | 'schema' | 'orm' | 'graphql' | 'flow' | 'realtime';

export default function DocsPage() {
  const { theme, setTheme } = useTheme();
  const [section, setSection] = useState<Section>('overview');

  const sections: { key: Section; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'schema', label: 'Schema' },
    { key: 'orm', label: 'ORM & DB' },
    { key: 'graphql', label: 'GraphQL' },
    { key: 'flow', label: 'Data Flow' },
    { key: 'realtime', label: 'Durable Objects' },
  ];

  return (
    <main className="min-h-screen p-6 md:p-12 flex justify-center" style={{ background: 'var(--gradient-hero)' }}>
      <div className="max-w-4xl w-full space-y-8">
        <div className="flex items-start justify-between animate-fade-in">
          <div>
            <Link href="/" className="text-xs font-medium tracking-wider uppercase hover:underline" style={{ color: 'var(--accent)' }}>&larr; Home</Link>
            <h1 className="text-3xl md:text-4xl font-black mt-3" style={{ fontFamily: "'Cabinet Grotesk', sans-serif", color: 'var(--text-strong)' }}>
              Architecture <span style={{ color: 'var(--accent)' }}>Deep Dive</span>
            </h1>
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
              Next.js + GraphQL Yoga + Drizzle ORM + Cloudflare D1
            </p>
          </div>
          <ThemePicker current={theme} onChange={setTheme} />
        </div>

        <div className="flex gap-1.5 p-1.5 rounded-xl flex-wrap" style={{ background: 'var(--bg-raised)' }}>
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: section === s.key ? 'var(--accent)' : 'transparent',
                color: section === s.key ? 'var(--bg)' : 'var(--text-muted)',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {section === 'overview' && <OverviewSection />}
        {section === 'schema' && <SchemaSection />}
        {section === 'orm' && <OrmSection />}
        {section === 'graphql' && <GraphQLSection />}
        {section === 'flow' && <FlowSection />}
        {section === 'realtime' && <RealtimeSection />}
      </div>
    </main>
  );
}

function DocCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`themed-card p-6 space-y-4 ${className}`}>{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold" style={{ color: 'var(--text-strong)' }}>{children}</h2>;
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold" style={{ color: 'var(--text-strong)' }}>{children}</h3>;
}

function Prose({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{children}</p>;
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: 'var(--bg-input)', color: 'var(--accent-2)' }}>
      {children}
    </code>
  );
}

function InfoBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 text-sm" style={{ background: 'var(--accent-2-subtle)', border: '1px solid var(--accent-2)' }}>
      <span className="font-semibold" style={{ color: 'var(--accent-2)' }}>{title}</span>
      <span style={{ color: 'var(--text)' }}> — {children}</span>
    </div>
  );
}

function WarnBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 text-sm" style={{ background: 'var(--warning-subtle)', border: '1px solid var(--warning)' }}>
      <span className="font-semibold" style={{ color: 'var(--warning)' }}>{title}</span>
      <span style={{ color: 'var(--text)' }}> — {children}</span>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
            {headers.map((h, i) => (
              <th key={i} className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: ri < rows.length - 1 ? '1px solid var(--border-subtle)' : undefined, background: ri % 2 === 0 ? 'transparent' : 'var(--bg-raised)' }}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-2.5" style={{ color: 'var(--text)' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatGrid({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s, i) => (
        <div key={i} className="text-center py-4 rounded-xl" style={{ background: 'var(--bg-raised)' }}>
          <div className="text-2xl font-bold font-mono" style={{ color: 'var(--accent)' }}>{s.value}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function FlowDiagram({ steps, color }: { steps: string[]; color?: string }) {
  const c = color || 'var(--accent)';
  return (
    <div className="flex items-center gap-2 flex-wrap justify-center py-4">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="px-4 py-2 rounded-lg text-xs font-semibold" style={{ border: `1.5px solid ${c}`, color: c, background: 'var(--bg-card)' }}>
            {step}
          </div>
          {i < steps.length - 1 && <span className="text-sm" style={{ color: 'var(--text-faint)' }}>→</span>}
        </div>
      ))}
    </div>
  );
}

/* ─── Collapsible ─── */

function Collapsible({ title, badge, children, defaultOpen = false }: { title: string; badge?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full text-left py-1.5 group">
        <span className="text-xs transition-transform" style={{ color: 'var(--text-faint)', transform: open ? 'rotate(90deg)' : 'rotate(0)' }}>▶</span>
        <span className="text-sm font-mono font-semibold" style={{ color: 'var(--text-strong)' }}>{title}</span>
        {badge && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)' }}>{badge}</span>}
      </button>
      {open && <div className="ml-5 mt-1 space-y-1">{children}</div>}
    </div>
  );
}

/* ─── Section Content ─── */

function OverviewSection() {
  return (
    <div className="space-y-6 animate-fade-in">
      <DocCard>
        <SectionTitle>System Overview</SectionTitle>
        <Prose>
          The app is a real-time audience interaction platform — Q&A with upvoting, live polls (5 types),
          timed quizzes with leaderboards, and multi-question surveys. It runs as a single Cloudflare Pages
          deployment with no separate backend or WebSocket server.
        </Prose>
        <StatGrid stats={[
          { value: '17', label: 'Database tables' },
          { value: '9', label: 'GraphQL queries' },
          { value: '15', label: 'GraphQL mutations' },
          { value: '5', label: 'Poll types' },
        ]} />
      </DocCard>

      <DocCard>
        <SubTitle>Stack at a Glance</SubTitle>
        <DataTable
          headers={['Layer', 'Technology', 'Role']}
          rows={[
            ['Framework', 'Next.js 16 (App Router)', 'SSR/CSR, routing, API route handler'],
            ['API', 'GraphQL Yoga', 'Schema-first GraphQL at /api/graphql'],
            ['Client', 'Apollo Client 4', 'Query/mutation hooks with 3s poll interval'],
            ['ORM', 'Drizzle ORM', 'Type-safe schema, relational queries, migrations'],
            ['Database', 'Cloudflare D1 (SQLite)', 'Edge-located, zero-config SQL'],
            ['Auth', 'JWT (jsonwebtoken)', 'Stateless 7-day tokens, SHA-256 passwords'],
            ['Deploy', '@opennextjs/cloudflare', 'Adapts Next.js to Cloudflare Workers'],
            ['Styling', 'Tailwind CSS 4', 'Utility-first with CSS custom properties'],
          ]}
        />
      </DocCard>

      <InfoBox title="Current real-time strategy">
        Apollo Client polling at 3-second intervals. Every client re-fetches the full session query on a timer. Works for small audiences but doesn&apos;t scale — see the Durable Objects section for the migration path.
      </InfoBox>
    </div>
  );
}

function SchemaSection() {
  const tables = [
    { name: 'users', cols: ['id PK', 'email UNIQUE', 'password_hash', 'display_name', 'created_at'], note: 'Host accounts' },
    { name: 'sessions', cols: ['id PK', 'code UNIQUE', 'title', 'is_moderated', 'passcode_hash?', 'primary_color?', 'logo_url?', 'owner_id FK→users', 'created_at'], note: 'Room code is join key' },
    { name: 'questions', cols: ['id PK', 'text', 'author_name?', 'is_approved', 'is_highlighted', 'is_answered', 'session_id FK', 'created_at'], note: 'Moderated sessions require approval' },
    { name: 'upvotes', cols: ['id PK', 'voter_token', 'question_id FK'], note: 'UNIQUE(voter_token, question_id)' },
    { name: 'replies', cols: ['id PK', 'text', 'author_name', 'question_id FK', 'created_at'], note: 'Threaded replies' },
    { name: 'polls', cols: ['id PK', 'type', 'question', 'is_active', 'allow_multiple', 'session_id FK', 'created_at'], note: '5 types: MC, WC, Rating, Open, Ranking' },
    { name: 'poll_options', cols: ['id PK', 'text', 'position', 'poll_id FK'], note: 'MC and ranking' },
    { name: 'poll_responses', cols: ['id PK', 'voter_token', 'poll_id FK', 'selected_option_id?', 'text_value?', 'rating_value?', 'ranking_order?'], note: 'Polymorphic. UNIQUE(voter_token, poll_id)' },
    { name: 'quizzes', cols: ['id PK', 'title', 'is_active', 'current_question_index', 'session_id FK', 'created_at'], note: '-1 = not started' },
    { name: 'quiz_questions', cols: ['id PK', 'text', 'time_limit', 'position', 'correct_option_id?', 'quiz_id FK'], note: 'Default 20s' },
    { name: 'quiz_options', cols: ['id PK', 'text', 'position', 'quiz_question_id FK'], note: '4 per question' },
    { name: 'quiz_answers', cols: ['id PK', 'voter_token', 'quiz_question_id FK', 'selected_option_id?', 'answered_in_ms', 'is_correct', 'score'], note: 'Speed-based scoring' },
    { name: 'surveys', cols: ['id PK', 'title', 'is_open', 'session_id FK', 'created_at'], note: 'Multi-question form' },
    { name: 'survey_questions', cols: ['id PK', 'type', 'text', 'position', 'is_required', 'survey_id FK'], note: 'MC, Open, Rating' },
    { name: 'survey_options', cols: ['id PK', 'text', 'position', 'survey_question_id FK'], note: 'MC only' },
    { name: 'survey_responses', cols: ['id PK', 'voter_token', 'survey_id FK', 'submitted_at'], note: 'UNIQUE(voter_token, survey_id)' },
    { name: 'survey_answers', cols: ['id PK', 'survey_response_id FK', 'survey_question_id FK', 'selected_option_id?', 'text_value?', 'rating_value?'], note: 'One per question' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <DocCard>
        <SectionTitle>Database Schema — 17 Tables</SectionTitle>
        <Prose>
          All tables use integer auto-increment primary keys. Foreign keys cascade on delete
          (except users → sessions which sets null). Booleans are integers with Drizzle&apos;s
          mode: &apos;boolean&apos; mapping. Timestamps default to CURRENT_TIMESTAMP.
        </Prose>
      </DocCard>

      <DocCard>
        <SubTitle>Entity Relationship Tree</SubTitle>
        <pre className="text-xs font-mono leading-relaxed p-4 rounded-xl overflow-x-auto" style={{ background: 'var(--bg-input)', color: 'var(--accent-2)' }}>{`users
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
                    └── survey_answers`}</pre>
      </DocCard>

      <DocCard>
        <SubTitle>Table Details</SubTitle>
        <div className="space-y-1">
          {tables.map((tbl) => (
            <Collapsible key={tbl.name} title={tbl.name} badge={`${tbl.cols.length} cols`}>
              <div className="space-y-1 pb-2">
                {tbl.cols.map((col, i) => (
                  <div key={i} className="text-xs font-mono" style={{ color: col.includes('PK') ? 'var(--accent)' : 'var(--text-muted)' }}>{col}</div>
                ))}
                <div className="text-[10px] italic mt-1" style={{ color: 'var(--text-faint)' }}>{tbl.note}</div>
              </div>
            </Collapsible>
          ))}
        </div>
      </DocCard>

      <DocCard>
        <SubTitle>Key Design Decisions</SubTitle>
        <div className="space-y-3">
          <Prose><strong style={{ color: 'var(--text-strong)' }}>Anonymous participation via voter tokens.</strong> Audience members don&apos;t need accounts. A random UUID generated client-side is stored in localStorage. Unique indexes on (voter_token, entity_id) prevent double-voting.</Prose>
          <Prose><strong style={{ color: 'var(--text-strong)' }}>Polymorphic poll responses.</strong> A single poll_responses table handles all 5 poll types through nullable columns: selected_option_id for MC, rating_value for ratings, text_value for word cloud / open text, and ranking_order (JSON) for ranking.</Prose>
          <Prose><strong style={{ color: 'var(--text-strong)' }}>Quiz scoring formula.</strong> score = max(100, 1000 − (answeredInMs / timeLimitMs) × 900) for correct answers, 0 for wrong. Faster answers earn more, floor of 100.</Prose>
        </div>
      </DocCard>
    </div>
  );
}

function OrmSection() {
  return (
    <div className="space-y-6 animate-fade-in">
      <DocCard>
        <SectionTitle>Drizzle ORM & Cloudflare D1</SectionTitle>
        <Prose>
          Drizzle provides type-safe schema definitions, relational queries (similar to Prisma&apos;s include),
          and migration generation — all running natively in Cloudflare Workers without polyfills. D1 is
          Cloudflare&apos;s edge SQLite, co-located with the Workers that query it.
        </Prose>
      </DocCard>

      <DocCard>
        <SubTitle>Schema Pattern</SubTitle>
        <Prose>
          Every table uses <Mono>sqliteTable()</Mono> from drizzle-orm/sqlite-core. Booleans use <Mono>integer(&apos;col&apos;, {'{'} mode: &apos;boolean&apos; {'}'})</Mono>. Relations are declared separately with <Mono>relations()</Mono> — they enable nested <Mono>with:</Mono> queries without affecting the SQL schema.
        </Prose>
      </DocCard>

      <DocCard>
        <SubTitle>Dual-Mode DB Context</SubTitle>
        <Prose>
          The GraphQL route resolves the database at runtime. On Cloudflare, it reads the D1 binding from <Mono>getCloudflareContext().env.DB</Mono>. In local dev, it falls back to better-sqlite3 against the local <Mono>.wrangler/state/</Mono> SQLite file.
        </Prose>
      </DocCard>

      <DocCard>
        <SubTitle>Migration Workflow</SubTitle>
        <DataTable
          headers={['Command', 'Target', 'What it does']}
          rows={[
            ['npm run db:generate', '—', 'Drizzle Kit diffs schema.ts, emits new .sql migration'],
            ['npm run db:migrate', 'Local', 'wrangler d1 migrations apply --local'],
            ['npm run db:migrate:prod', 'Remote D1', 'wrangler d1 migrations apply --remote'],
            ['npm run db:seed', 'Local', 'Runs seed.ts with better-sqlite3'],
            ['npm run db:seed:prod', 'Remote D1', 'Generates SQL, runs wrangler d1 execute --remote'],
          ]}
        />
      </DocCard>

      <WarnBox title="D1 limitations">
        Single-region primary writer + read replicas. Write throughput is ~100 writes/sec. High-concurrency voting will bottleneck — a key motivator for Durable Objects.
      </WarnBox>
    </div>
  );
}

function GraphQLSection() {
  return (
    <div className="space-y-6 animate-fade-in">
      <DocCard>
        <SectionTitle>GraphQL API Layer</SectionTitle>
        <Prose>
          A single Next.js Route Handler at <Mono>/api/graphql</Mono> delegates to GraphQL Yoga. Schema-first — the SDL and resolvers are co-located in route.ts (~860 lines). Each resolver makes direct Drizzle queries; there is no DataLoader or batching layer.
        </Prose>
      </DocCard>

      <DocCard>
        <SubTitle>Queries (9)</SubTitle>
        <DataTable
          headers={['Query', 'Arguments', 'Returns', 'Purpose']}
          rows={[
            ['me', 'token', 'User?', 'Verify JWT, return authenticated user'],
            ['checkSession', 'code', 'SessionCheck!', 'Lightweight exists + passcode check'],
            ['session', 'code, passcode?', 'Session?', 'Full session with all nested data'],
            ['pendingQuestions', 'sessionId', '[Question!]!', 'Unapproved questions for moderation'],
            ['poll', 'pollId', 'Poll?', 'Single poll with options and responses'],
            ['quiz', 'quizId', 'Quiz?', 'Quiz with ordered questions and options'],
            ['quizLeaderboard', 'quizId', '[LeaderboardEntry!]!', 'Aggregated scores by voter'],
            ['survey', 'surveyId', 'Survey?', 'Survey with ordered questions'],
            ['sessionAnalytics', 'sessionId', 'SessionAnalytics!', 'Aggregate counts across all activity'],
          ]}
        />
      </DocCard>

      <DocCard>
        <SubTitle>Mutations (15 operations)</SubTitle>
        <DataTable
          headers={['Mutation', 'Purpose']}
          rows={[
            ['register / login', 'Email/password auth, returns JWT + user'],
            ['createSession', 'New session with optional passcode and owner'],
            ['updateSessionBranding', 'Set primary color and logo URL'],
            ['createQuestion', 'Post question (auto-approved unless moderated)'],
            ['approveQuestion / rejectQuestion', 'Moderation actions'],
            ['highlightQuestion / markAsAnswered', 'Host curation controls'],
            ['replyToQuestion', 'Threaded reply from host or participant'],
            ['upvoteQuestion', 'Idempotent upvote (one per voter_token)'],
            ['createPoll / activate / deactivate', 'Poll lifecycle'],
            ['submitPollResponse', 'MC, rating, word cloud, ranking, or open text'],
            ['createQuiz / addQuizQuestion', 'Quiz authoring with correct answer'],
            ['startQuiz / nextQuizQuestion', 'Host-driven quiz progression'],
            ['submitQuizAnswer', 'Timed answer with speed-based scoring'],
            ['createSurvey / addSurveyQuestion', 'Multi-question form builder'],
            ['submitSurveyResponse / closeSurvey', 'Batch submission, close survey'],
          ]}
        />
      </DocCard>

      <DocCard>
        <SubTitle>Field Resolvers</SubTitle>
        <DataTable
          headers={['Type', 'Field', 'Implementation']}
          rows={[
            ['Question', 'upvoteCount', 'COUNT(*) from upvotes per question'],
            ['Question', 'replies', 'Eager-loaded array or fallback query'],
            ['Poll', 'responseCount', 'COUNT(*) from poll_responses per poll'],
            ['PollOption', 'voteCount', 'COUNT(*) from poll_responses per option'],
            ['PollResponse', 'rankingOrder', 'JSON.parse() of stored string'],
            ['Survey', 'responseCount', 'COUNT(*) from survey_responses per survey'],
          ]}
        />
      </DocCard>

      <InfoBox title="N+1 query pattern">
        upvoteCount and voteCount execute a COUNT query per item. 50 questions = ~50 extra COUNT queries. Acceptable now but would benefit from DataLoader or pre-aggregation at scale.
      </InfoBox>
    </div>
  );
}

function FlowSection() {
  return (
    <div className="space-y-6 animate-fade-in">
      <DocCard>
        <SectionTitle>Request Data Flow</SectionTitle>
        <FlowDiagram steps={['React UI', 'Apollo Client', 'Next.js Route', 'GraphQL Yoga', 'Drizzle ORM', 'Cloudflare D1']} />
      </DocCard>

      <DocCard>
        <SubTitle>Example: Submitting a Question</SubTitle>
        <DataTable
          headers={['Step', 'Layer', 'What happens']}
          rows={[
            ['1', 'React component', 'User types question, clicks Ask. Calls createQuestion via useMutation.'],
            ['2', 'Apollo Client', 'Serializes GQL as POST to /api/graphql. HttpLink uses relative URL.'],
            ['3', 'Next.js Route', 'POST export passes Request to Yoga\'s handle() method.'],
            ['4', 'GraphQL Yoga', 'Parses operation, resolves DB context, dispatches to resolver.'],
            ['5', 'Resolver', 'Validates input (trim, length), checks session, checks moderation, inserts.'],
            ['6', 'Drizzle ORM', 'Translates .insert().values().returning() into INSERT ... RETURNING SQL.'],
            ['7', 'Cloudflare D1', 'Executes SQL against edge SQLite. Returns inserted row.'],
            ['8', 'Response', 'Row flows back up the stack. onCompleted triggers refetch.'],
          ]}
        />
      </DocCard>

      <DocCard>
        <SubTitle>Polling-Based Updates</SubTitle>
        <Prose>
          The session page uses Apollo&apos;s <Mono>pollInterval: 3000</Mono> — every 3 seconds, every connected
          client re-fetches the entire GetSessionDetails query (all questions, polls, quizzes, surveys).
        </Prose>
        <StatGrid stats={[
          { value: '3s', label: 'Session poll interval' },
          { value: '5s', label: 'Moderation poll interval' },
          { value: '~6KB', label: 'Typical response size' },
        ]} />
      </DocCard>

      <WarnBox title="Scaling ceiling">
        100 concurrent users = ~33 GraphQL requests/sec, each joining 5+ tables. D1 handles this, but 500+ users would saturate the connection and increase latency noticeably.
      </WarnBox>
    </div>
  );
}

function RealtimeSection() {
  return (
    <div className="space-y-6 animate-fade-in">
      <DocCard>
        <SectionTitle>Migration to Durable Objects & Real-Time</SectionTitle>
        <Prose>
          Durable Objects (DOs) are Cloudflare&apos;s solution for stateful, single-threaded, globally
          addressable actors. Each DO instance has its own transactional SQLite storage and can hold
          WebSocket connections — ideal for per-session state coordination.
        </Prose>
        <FlowDiagram steps={['Browser (WS)', 'Worker (Router)', 'Session DO', 'D1 (Persistence)']} color="var(--success)" />
        <Prose>
          One Durable Object per session code. All clients for a session connect to the same DO.
          The DO holds WebSocket connections and broadcasts mutations instantly.
        </Prose>
      </DocCard>

      <DocCard>
        <SubTitle>Phase 1: Session Durable Object</SubTitle>
        <Prose>
          Create a <Mono>SessionDO</Mono> class keyed by session code. It accepts WebSocket upgrades via the
          Hibernation API. On first access, it loads the session from D1 into memory. Subsequent reads are
          served from memory — no D1 round-trip.
        </Prose>
        <Prose>
          <strong style={{ color: 'var(--text-strong)' }}>wrangler.toml:</strong> Add a <Mono>[[durable_objects.bindings]]</Mono> block
          and a <Mono>[[migrations]]</Mono> block for the DO&apos;s embedded SQLite storage.
        </Prose>
      </DocCard>

      <DocCard>
        <SubTitle>Phase 2: WebSocket Protocol</SubTitle>
        <Prose>
          Replace Apollo polling with a WebSocket connection. On session page load, connect to <Mono>/api/ws?code=SLIDODEV</Mono>. The Worker routes to the correct DO via <Mono>env.SESSION_DO.get(id)</Mono>.
        </Prose>
        <DataTable
          headers={['Direction', 'Type', 'Payload']}
          rows={[
            ['Client → DO', 'mutation', '{ action: "upvote", questionId, voterToken }'],
            ['DO → All', 'broadcast', '{ type: "questionUpdated", question: {...} }'],
            ['DO → All', 'broadcast', '{ type: "pollResponseAdded", pollId, counts }'],
            ['DO → Client', 'ack', '{ requestId, success: true }'],
            ['DO → Client', 'error', '{ requestId, error: "Already voted" }'],
          ]}
        />
      </DocCard>

      <DocCard>
        <SubTitle>Phase 3: In-Memory State + D1 Write-Behind</SubTitle>
        <Prose>
          <strong style={{ color: 'var(--text-strong)' }}>Hot path (in DO memory):</strong> Upvotes, poll responses, and quiz answers
          apply to in-memory state immediately and broadcast within milliseconds. The DO batches D1 writes on a 1-second debounce.
        </Prose>
        <Prose>
          <strong style={{ color: 'var(--text-strong)' }}>Cold path (D1 via GraphQL):</strong> Session creation, quiz authoring, survey creation, and analytics stay as GraphQL mutations hitting D1 directly. Low-frequency, host-only operations.
        </Prose>
      </DocCard>

      <DocCard>
        <SubTitle>Phase 4: Hibernation & Cost Optimization</SubTitle>
        <Prose>
          Use the Hibernation API so DOs don&apos;t bill for idle WebSocket connections. The DO sleeps between messages; Cloudflare wakes it on incoming frames. State reloads from embedded SQLite or D1 on wake. An alarm flushes pending writes before hibernation.
        </Prose>
      </DocCard>

      <DocCard>
        <SubTitle>What Changes in the Codebase</SubTitle>
        <DataTable
          headers={['File / Area', 'Current', 'After DOs']}
          rows={[
            ['wrangler.toml', 'D1 binding only', '+ DO binding + migration tag'],
            ['src/do/SessionDO.ts', 'Does not exist', 'DO class with WS handling'],
            ['api/ws/route.ts', 'Does not exist', 'Upgrades to WS, routes to DO'],
            ['session/[code]/page.tsx', 'Apollo pollInterval: 3000', 'WS connection, dispatch/receive'],
            ['api/graphql/route.ts', 'All mutations → D1', 'High-freq mutations → DO'],
            ['apollo-client.ts', 'HttpLink only', 'Keep for auth; add WS for live data'],
          ]}
        />
      </DocCard>

      <DocCard>
        <SubTitle>What Stays the Same</SubTitle>
        <div className="space-y-2">
          <Prose>The Drizzle schema and D1 database remain the source of truth for all persistent data.</Prose>
          <Prose>GraphQL continues to serve session creation, auth, analytics, and CSV export.</Prose>
          <Prose>The React component tree and UI remain unchanged — only the data-fetching hooks change.</Prose>
        </div>
      </DocCard>

      <InfoBox title="Estimated effort">
        Phase 1–2 (basic DO + WebSocket) can be done in a focused sprint. The existing GraphQL resolvers contain all business logic (validation, scoring, deduplication) that can be extracted into shared functions used by both the DO handler and the remaining GraphQL mutations.
      </InfoBox>
    </div>
  );
}
