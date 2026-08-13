import crypto from 'node:crypto';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

function hash(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function esc(s: string) {
  return s.replace(/'/g, "''");
}

const lines: string[] = [];
const emit = (sql: string) => lines.push(sql);

// Use a high starting ID range to avoid collisions with SLIDODEV data
const SESSION_ID = 100;
const Q_START = 100;
const UPVOTE_START = 200;
const REPLY_START = 100;
const POLL_START = 100;
const POLL_OPT_START = 100;
const POLL_RESP_START = 200;

const VOTER_TOKENS = [
  'an-voter-alice', 'an-voter-bob', 'an-voter-carol',
  'an-voter-dave', 'an-voter-eve', 'an-voter-frank',
  'an-voter-grace', 'an-voter-heidi',
];

// ── Session (owned by host user id=1 from SLIDODEV seed) ──
emit(`INSERT INTO sessions (id, code, title, is_moderated, owner_id) VALUES (${SESSION_ID}, 'AGENTNEWS', '${esc("AI Agents in the Wild — HN's Greatest Hits")}', 0, 1);`);

// ── Questions from HN (AI agent stories, sorted by points) ──
const stories = [
  { title: 'An AI agent published a hit piece on me', author: 'scottshambaugh', points: 2346, comments: 951, url: 'https://theshamblog.com/an-ai-agent-published-a-hit-piece-on-me/', date: '2026-02' },
  { title: 'AI agent bankrupted their operator while trying to scan DN42', author: 'xiaoyu2006', points: 1467, comments: 536, url: 'https://lantian.pub/en/article/fun/ai-agent-bankrupted-their-operator-scan-dn42lantian.lantian/', date: '2026-06' },
  { title: 'OpenCode — Open source AI coding agent', author: 'rbanffy', points: 1274, comments: 618, url: 'https://opencode.ai/', date: '2026-03' },
  { title: 'Andrej Karpathy: It will take a decade to work through the issues with agents', author: 'ctoth', points: 1212, comments: 1115, url: 'https://www.dwarkesh.com/p/andrej-karpathy', date: '2025-10' },
  { title: 'You should write an agent (Fly.io)', author: 'tabletcorry', points: 1070, comments: 395, url: 'https://fly.io/blog/everyone-write-an-agent/', date: '2025-11' },
  { title: 'AlphaEvolve: A Gemini-powered coding agent for designing advanced algorithms', author: 'Fysi', points: 1036, comments: 270, url: 'https://deepmind.google/discover/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/', date: '2025-05' },
  { title: 'AI agent opens a PR, writes a blogpost to shame the maintainer who closes it', author: 'wrxd', points: 953, comments: 750, url: 'https://github.com/matplotlib/matplotlib/pull/31132', date: '2026-02' },
  { title: 'Opus 4.5 is not the normal AI agent experience that I have had thus far', author: 'tbassetto', points: 879, comments: 1353, url: 'https://burkeholland.github.io/posts/opus-4-5-change-everything/', date: '2026-01' },
  { title: 'An AI agent deleted our production database. The agent\'s confession is below', author: 'jeremyccrane', points: 860, comments: 1032, url: 'https://twitter.com/lifeof_jer/status/2048103471019434248', date: '2026-04' },
  { title: 'AGENTS.md — Open format for guiding coding agents', author: 'ghuntley', points: 837, comments: 382, url: 'https://agents.md/', date: '2025-08' },
  { title: 'Agent Safehouse — macOS-native sandboxing for local agents', author: 'atombender', points: 823, comments: 178, url: 'https://agent-safehouse.dev/', date: '2026-03' },
  { title: 'OpenAI adds MCP support to Agents SDK', author: 'gronky_', points: 807, comments: 267, url: 'https://openai.github.io/openai-agents-python/mcp/', date: '2025-03' },
  { title: 'Leanstral: Open-source agent for trustworthy coding and formal proof engineering', author: 'Poudlardo', points: 783, comments: 191, url: 'https://mistral.ai/news/leanstral', date: '2026-03' },
  { title: 'Muse Glimmer: 30B-parameter model optimized for always-on local agent workflows', author: 'riordan', points: 778, comments: 433, url: 'https://research.meta.ai/blog/introducing-muse-glimmer-open-agentic-model', date: '2026-08' },
  { title: 'CLI agents make self-hosting on a home server easier and fun', author: 'websku', points: 775, comments: 549, url: 'https://fulghum.io/self-hosting', date: '2026-01' },
];

let upvoteId = UPVOTE_START;
for (let i = 0; i < stories.length; i++) {
  const s = stories[i];
  const qId = Q_START + i;
  const questionText = `${s.title}\n\n${s.url}\n\n${s.points} points · ${s.comments} comments on HN · ${s.date}`;
  emit(`INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (${qId}, '${esc(questionText)}', '${esc(s.author)}', 1, ${i < 3 ? 1 : 0}, 0, ${SESSION_ID});`);

  const scaledUpvotes = Math.min(Math.round(s.points / 300), VOTER_TOKENS.length);
  for (let vi = 0; vi < scaledUpvotes; vi++) {
    emit(`INSERT INTO upvotes (id, voter_token, question_id) VALUES (${upvoteId++}, '${VOTER_TOKENS[vi]}', ${qId});`);
  }
}

// ── Replies ──
let replyId = REPLY_START;
const repliesData = [
  { qIdx: 0, author: 'HN Reader', text: 'This is a wild story. The agent autonomously decided to write and publish a blog post attacking the OSS maintainer after its PR got closed. We need serious guardrails.' },
  { qIdx: 1, author: 'HN Reader', text: 'Classic case of an agent with too much autonomy and access to billing APIs. The cost ran up before anyone noticed. Always set hard spending limits.' },
  { qIdx: 6, author: 'HN Reader', text: 'The matplotlib maintainers handled this well. But it raises questions about how OSS projects should handle AI-generated contributions going forward.' },
  { qIdx: 8, author: 'HN Reader', text: 'The "confession" transcript is both hilarious and terrifying. The agent methodically reasoned through why dropping the database was the "correct" action.' },
  { qIdx: 3, author: 'HN Reader', text: 'Karpathy is right that agents are a paradigm shift, not just better chatbots. The error modes are fundamentally different and we don\'t have good patterns yet.' },
];
for (const r of repliesData) {
  emit(`INSERT INTO replies (id, text, author_name, question_id) VALUES (${replyId++}, '${esc(r.text)}', '${esc(r.author)}', ${Q_START + r.qIdx});`);
}

// ── Poll 1: Biggest agent risk ──
const pollId1 = POLL_START;
emit(`INSERT INTO polls (id, type, question, is_active, session_id) VALUES (${pollId1}, 'MULTIPLE_CHOICE', 'What is the biggest risk with autonomous AI agents?', 1, ${SESSION_ID});`);

const p1Opts = ['Uncontrolled spending / resource usage', 'Data loss or corruption', 'Reputation damage (e.g. rogue PRs/posts)', 'Security vulnerabilities', 'Hallucinated actions with real consequences'];
let optId = POLL_OPT_START;
for (let i = 0; i < p1Opts.length; i++) {
  emit(`INSERT INTO poll_options (id, text, position, poll_id) VALUES (${optId + i}, '${esc(p1Opts[i])}', ${i}, ${pollId1});`);
}
const p1Votes = [4, 3, 5, 2, 6];
let respId = POLL_RESP_START;
for (let oi = 0; oi < p1Opts.length; oi++) {
  for (let v = 0; v < p1Votes[oi]; v++) {
    emit(`INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (${respId++}, 'an-p1-${oi}-${v}', ${pollId1}, ${optId + oi});`);
  }
}
optId += p1Opts.length;

// ── Poll 2: Best coding agent ──
const pollId2 = POLL_START + 1;
emit(`INSERT INTO polls (id, type, question, is_active, session_id) VALUES (${pollId2}, 'MULTIPLE_CHOICE', 'Which AI coding agent are you most excited about?', 1, ${SESSION_ID});`);

const p2Opts = ['Cursor / Claude agents', 'OpenCode (open source)', 'GitHub Copilot Workspace', 'Devin / Cognition', 'Custom / self-hosted agents'];
for (let i = 0; i < p2Opts.length; i++) {
  emit(`INSERT INTO poll_options (id, text, position, poll_id) VALUES (${optId + i}, '${esc(p2Opts[i])}', ${i}, ${pollId2});`);
}
const p2Votes = [6, 4, 3, 2, 5];
for (let oi = 0; oi < p2Opts.length; oi++) {
  for (let v = 0; v < p2Votes[oi]; v++) {
    emit(`INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (${respId++}, 'an-p2-${oi}-${v}', ${pollId2}, ${optId + oi});`);
  }
}
optId += p2Opts.length;

// ── Poll 3: Word Cloud ──
const pollId3 = POLL_START + 2;
emit(`INSERT INTO polls (id, type, question, is_active, session_id) VALUES (${pollId3}, 'WORD_CLOUD', 'One word to describe the current state of AI agents', 1, ${SESSION_ID});`);

const agentWords = ['chaotic', 'promising', 'dangerous', 'exciting', 'overhyped', 'transformative', 'chaotic', 'exciting', 'risky', 'inevitable', 'promising', 'wild', 'chaotic', 'powerful', 'unready'];
for (let i = 0; i < agentWords.length; i++) {
  emit(`INSERT INTO poll_responses (id, voter_token, poll_id, text_value) VALUES (${respId++}, 'an-wc-${i}', ${pollId3}, '${agentWords[i]}');`);
}

// ── Poll 4: Rating ──
const pollId4 = POLL_START + 3;
emit(`INSERT INTO polls (id, type, question, is_active, session_id) VALUES (${pollId4}, 'RATING', 'How much do you trust AI agents with production systems today?', 0, ${SESSION_ID});`);

const trustRatings = [2, 1, 3, 2, 1, 2, 3, 1];
for (let i = 0; i < trustRatings.length; i++) {
  emit(`INSERT INTO poll_responses (id, voter_token, poll_id, rating_value) VALUES (${respId++}, '${VOTER_TOKENS[i]}', ${pollId4}, ${trustRatings[i]});`);
}

// ── Write and execute ──
const sqlFile = join(process.cwd(), 'seed-agent-news.sql');
writeFileSync(sqlFile, lines.join('\n'), 'utf-8');
console.log(`Generated ${lines.length} SQL statements → ${sqlFile}`);

try {
  const target = process.argv.includes('--remote') ? '--remote' : '--local';
  console.log(`Executing against ${target.replace('--', '')} D1...`);
  execSync(`npx wrangler d1 execute slido-db ${target} --file=${sqlFile}`, { stdio: 'inherit' });
  console.log('\nSeed complete!');
  console.log('  Session: AGENTNEWS');
  console.log(`  Questions: ${stories.length} (from HN top "agents" stories)`);
  console.log('  Polls: 4 (risks, coding agents, word cloud, trust rating)');
  console.log('  Replies: 5');
} finally {
  if (!process.argv.includes('--keep-sql')) unlinkSync(sqlFile);
}
