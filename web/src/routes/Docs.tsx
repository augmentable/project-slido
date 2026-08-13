import { useState } from 'react';
import { Link } from 'react-router';
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
    { key: 'realtime', label: 'Real-Time' },
  ];

  return (
    <main className="min-h-screen p-6 md:p-12 flex justify-center" style={{ background: 'var(--gradient-hero)' }}>
      <div className="max-w-4xl w-full space-y-8">
        <div className="flex items-start justify-between animate-fade-in">
          <div>
            <Link to="/" className="text-xs font-medium tracking-wider uppercase hover:underline" style={{ color: 'var(--accent)' }}>&larr; Home</Link>
            <h1 className="text-3xl md:text-4xl font-black mt-3" style={{ fontFamily: "'Cabinet Grotesk', sans-serif", color: 'var(--text-strong)' }}>
              Architecture <span style={{ color: 'var(--accent)' }}>Deep Dive</span>
            </h1>
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
              Vite + Hono + GraphQL Yoga + Drizzle ORM + Cloudflare D1
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

function OverviewSection() {
  return (
    <div className="space-y-6 animate-fade-in">
      <DocCard>
        <SectionTitle>System Overview</SectionTitle>
        <Prose>
          The app is a real-time audience interaction platform — Q&A with upvoting, live polls (5 types),
          timed quizzes with leaderboards, and multi-question surveys. It runs as a Cloudflare Worker with
          Durable Objects for real-time WebSocket communication and D1 for persistence.
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
            ['Frontend', 'Vite + React', 'SPA with client-side routing'],
            ['Routing', 'React Router v7', 'Declarative client-side routes'],
            ['Real-time', 'Durable Objects (SessionDO)', 'Per-session WebSocket hub with in-memory state'],
            ['API', 'Hono + GraphQL Yoga', 'Worker entry point + schema-first GraphQL at /api/graphql'],
            ['Client', 'Apollo Client 4 + WebSocket', 'WS primary, Apollo 3s polling fallback'],
            ['ORM', 'Drizzle ORM', 'Type-safe schema, relational queries, migrations'],
            ['Database', 'Cloudflare D1 (SQLite)', 'Edge-located, zero-config SQL'],
            ['Auth', 'JWT (jsonwebtoken)', 'Stateless 7-day tokens, SHA-256 passwords'],
            ['Deploy', 'Cloudflare Workers', 'Direct Hono worker — no adapter needed'],
            ['Styling', 'Tailwind CSS 4', 'Utility-first with CSS custom properties'],
            ['Theming', 'CSS variables + React context', '3 switchable themes (Night Owl, Paper, Electric)'],
            ['Typography', 'Satoshi + Cabinet Grotesk', 'Loaded via Fontshare CDN'],
          ]}
        />
      </DocCard>

      <InfoBox title="Real-time strategy">
        WebSocket via Durable Objects is the primary real-time path. One DO per session holds all connected clients and broadcasts state changes within microseconds. Apollo Client polling (3s interval) is the automatic fallback when WebSocket is unavailable — see the Real-Time section for details.
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
        <SubTitle>DB Context in Hono</SubTitle>
        <Prose>
          The Hono worker passes <Mono>c.env.DB</Mono> (the D1 binding) to GraphQL Yoga via context. The Drizzle client is created per-request with <Mono>getDb(c.env.DB)</Mono>. No fallback to better-sqlite3 is needed — <Mono>wrangler dev</Mono> provides a local D1 binding natively.
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
          A Hono route at <Mono>/api/graphql</Mono> delegates to GraphQL Yoga. Schema-first — the SDL and resolvers are co-located in <Mono>src/api/graphql.ts</Mono> (~860 lines). Each resolver makes direct Drizzle queries; there is no DataLoader or batching layer.
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
        <Prose>
          The app has two data paths: a <strong style={{ color: 'var(--success)' }}>real-time WebSocket path</strong> through
          Durable Objects (primary) and a <strong style={{ color: 'var(--accent)' }}>GraphQL HTTP path</strong> (fallback + host-only operations).
        </Prose>
      </DocCard>

      <DocCard>
        <SubTitle>Real-Time Path (WebSocket via Durable Object)</SubTitle>
        <FlowDiagram steps={['Browser (WS)', 'Hono Worker', 'SessionDO', 'Broadcast']} color="var(--success)" />
        <DataTable
          headers={['Step', 'Layer', 'What happens']}
          rows={[
            ['1', 'React hook', 'Session page opens. useSessionSocket connects via WS to /?code=SLIDODEV.'],
            ['2', 'Hono worker', 'Detects Upgrade: websocket header, routes to DO via env.SESSION_DO.get(id).'],
            ['3', 'SessionDO.fetch', 'Creates WebSocketPair, calls ctx.acceptWebSocket (Hibernation API).'],
            ['4', 'SessionDO', 'Loads full state from D1 (first access — cached thereafter). Sends initial state.'],
            ['5', 'User action', 'Client sends { type: "upvote", questionId, voterToken } over WebSocket.'],
            ['6', 'DO handler', 'Applies mutation to cachedState instantly. Queues D1 write.'],
            ['7', 'Broadcast', 'Sends updated state to all connected clients via ctx.getWebSockets().'],
            ['8', 'Write-behind', 'Alarm fires after 1s debounce. Pending writes flushed to D1.'],
          ]}
        />
      </DocCard>

      <DocCard>
        <SubTitle>GraphQL Path (HTTP — fallback + host operations)</SubTitle>
        <FlowDiagram steps={['React UI', 'Apollo Client', 'Hono Route', 'GraphQL Yoga', 'Drizzle ORM', 'D1']} />
        <Prose>
          Used for: auth, session creation/branding, quiz/poll/survey authoring, moderation, analytics, CSV export.
          After a GraphQL mutation, the client sends a <Mono>{'{ type: "refresh" }'}</Mono> message to the DO,
          which reloads from D1 and broadcasts to all peers.
        </Prose>
      </DocCard>

      <DocCard>
        <SubTitle>Fallback Behavior</SubTitle>
        <Prose>
          The <Mono>useSessionSocket</Mono> hook attempts WebSocket with exponential backoff (1s → 2s → 4s → ... → 30s).
          After 5 failed retries, it sets <Mono>fallbackToPolling = true</Mono>, which re-enables Apollo&apos;s <Mono>pollInterval: 3000</Mono>.
        </Prose>
        <StatGrid stats={[
          { value: '~μs', label: 'WS broadcast latency' },
          { value: '3s', label: 'Polling fallback interval' },
          { value: '5', label: 'Max WS retries' },
          { value: '30s', label: 'Max backoff' },
        ]} />
      </DocCard>
    </div>
  );
}

function RealtimeSection() {
  return (
    <div className="space-y-6 animate-fade-in">
      <DocCard>
        <SectionTitle>Durable Objects Architecture</SectionTitle>
        <Prose>
          One Durable Object (<Mono>SessionDO</Mono>) per session code. All clients viewing the same session connect to the same
          DO instance. The DO is the real-time coordination layer between D1 (persistent truth) and connected browsers.
        </Prose>
        <FlowDiagram steps={['Browser (WS)', 'Hono Worker', 'SessionDO', 'In-Memory State', 'Broadcast']} color="var(--success)" />
      </DocCard>

      <DocCard>
        <SubTitle>SessionDO Design (src/do/SessionDO.ts)</SubTitle>
        <div className="space-y-3">
          <Prose>
            <strong style={{ color: 'var(--text-strong)' }}>Hibernation API:</strong> Uses <Mono>ctx.acceptWebSocket</Mono>, <Mono>webSocketMessage</Mono>, <Mono>webSocketClose</Mono> so idle WebSocket connections don&apos;t incur billing. On wake, the session code restores from <Mono>ws.deserializeAttachment()</Mono>.
          </Prose>
          <Prose>
            <strong style={{ color: 'var(--text-strong)' }}>In-memory hot path:</strong> Upvotes and poll responses apply to <Mono>cachedState</Mono> in-memory and broadcast instantly. No D1 round-trip for read-side high-frequency mutations.
          </Prose>
          <Prose>
            <strong style={{ color: 'var(--text-strong)' }}>Write-behind batching:</strong> Pending D1 writes queue as <Mono>{'{ sql, params }'}</Mono> tuples and flush via the Alarm API (1s debounce). If the flush fails, writes re-queue for retry.
          </Prose>
          <Prose>
            <strong style={{ color: 'var(--text-strong)' }}>Last-client flush:</strong> When the last WebSocket disconnects, pending writes flush immediately to avoid data loss before DO eviction.
          </Prose>
          <Prose>
            <strong style={{ color: 'var(--text-strong)' }}>Immediate writes:</strong> <Mono>createQuestion</Mono> and <Mono>submitQuizAnswer</Mono> write to D1 synchronously because they need auto-increment IDs or <Mono>correct_option_id</Mono> verification (anti-cheat — correct answers never sent to clients).
          </Prose>
        </div>
      </DocCard>

      <DocCard>
        <SubTitle>WebSocket Protocol</SubTitle>
        <DataTable
          headers={['Direction', 'Type', 'Payload']}
          rows={[
            ['Client → DO', 'subscribe', '{ type: "subscribe", code: "SLIDODEV" }'],
            ['Client → DO', 'upvote', '{ type: "upvote", questionId, voterToken }'],
            ['Client → DO', 'createQuestion', '{ type: "createQuestion", text, authorName? }'],
            ['Client → DO', 'submitPollResponse', '{ type: "submitPollResponse", pollId, voterToken, ... }'],
            ['Client → DO', 'submitQuizAnswer', '{ type: "submitQuizAnswer", quizQuestionId, selectedOptionId, voterToken, answeredInMs }'],
            ['Client → DO', 'refresh', '{ type: "refresh" } — triggers D1 reload + broadcast'],
            ['DO → All', 'state', '{ type: "state", data: SessionState } — full session snapshot'],
            ['DO → Client', 'error', '{ type: "error", message, action? }'],
          ]}
        />
      </DocCard>

      <DocCard>
        <SubTitle>Hono Worker Entry</SubTitle>
        <Prose>
          The Hono worker directly exports the <Mono>SessionDO</Mono> class — no build patch scripts needed.
          The worker intercepts WebSocket upgrade requests at <Mono>/</Mono> and routes them to the correct DO
          instance by session code. All other API routes (<Mono>/api/graphql</Mono>, <Mono>/api/export/:sessionId</Mono>)
          are standard Hono handlers. Non-API requests fall through to static assets (the Vite-built SPA).
        </Prose>
      </DocCard>

      <DocCard>
        <SubTitle>What Stays on GraphQL</SubTitle>
        <div className="space-y-2">
          <Prose>Auth (<Mono>register</Mono>, <Mono>login</Mono>, <Mono>me</Mono>)</Prose>
          <Prose>Session creation and branding</Prose>
          <Prose>Poll/quiz/survey authoring (createPoll, addQuizQuestion, addSurveyQuestion, etc.)</Prose>
          <Prose>Host moderation (approve, reject, highlight, markAsAnswered, reply)</Prose>
          <Prose>Host controls (activatePoll, startQuiz, nextQuizQuestion, closeSurvey)</Prose>
          <Prose>Analytics and CSV export</Prose>
        </div>
        <InfoBox title="Mutation → broadcast pattern">
          After any GraphQL mutation, the client sends {'{ type: "refresh" }'} to the DO, which reloads from D1 and broadcasts the updated state to all connected peers.
        </InfoBox>
      </DocCard>
    </div>
  );
}
