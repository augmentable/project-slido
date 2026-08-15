import { env } from 'cloudflare:workers';
import { describe, it, expect, beforeEach } from 'vitest';
import type { SessionState, ServerMessage } from '../src/lib/ws-protocol';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  is_moderated INTEGER DEFAULT 0 NOT NULL,
  passcode_hash TEXT,
  primary_color TEXT,
  logo_url TEXT,
  owner_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  author_name TEXT,
  is_approved INTEGER DEFAULT 1 NOT NULL,
  is_highlighted INTEGER DEFAULT 0 NOT NULL,
  is_answered INTEGER DEFAULT 0 NOT NULL,
  session_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS upvotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voter_token TEXT NOT NULL,
  question_id INTEGER NOT NULL,
  value INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS upvotes_voter_question_idx ON upvotes (voter_token, question_id);
CREATE TABLE IF NOT EXISTS question_reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voter_token TEXT NOT NULL,
  question_id INTEGER NOT NULL,
  emoji TEXT NOT NULL,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS question_reactions_voter_question_emoji_idx
  ON question_reactions (voter_token, question_id, emoji);
CREATE TABLE IF NOT EXISTS replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  author_name TEXT NOT NULL,
  question_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS polls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  question TEXT NOT NULL,
  is_active INTEGER DEFAULT 0 NOT NULL,
  allow_multiple INTEGER DEFAULT 0 NOT NULL,
  session_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS poll_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  position INTEGER DEFAULT 0 NOT NULL,
  poll_id INTEGER NOT NULL,
  FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS poll_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voter_token TEXT NOT NULL,
  poll_id INTEGER NOT NULL,
  selected_option_id INTEGER,
  text_value TEXT,
  rating_value INTEGER,
  ranking_order TEXT,
  FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
  FOREIGN KEY (selected_option_id) REFERENCES poll_options(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS poll_responses_voter_poll_idx ON poll_responses (voter_token, poll_id);
CREATE TABLE IF NOT EXISTS quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  is_active INTEGER DEFAULT 0 NOT NULL,
  current_question_index INTEGER DEFAULT -1 NOT NULL,
  session_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS quiz_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  time_limit INTEGER DEFAULT 20 NOT NULL,
  position INTEGER DEFAULT 0 NOT NULL,
  correct_option_id INTEGER,
  quiz_id INTEGER NOT NULL,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS quiz_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  position INTEGER DEFAULT 0 NOT NULL,
  quiz_question_id INTEGER NOT NULL,
  FOREIGN KEY (quiz_question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS quiz_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voter_token TEXT NOT NULL,
  quiz_question_id INTEGER NOT NULL,
  selected_option_id INTEGER,
  answered_in_ms INTEGER DEFAULT 0 NOT NULL,
  is_correct INTEGER DEFAULT 0 NOT NULL,
  score INTEGER DEFAULT 0 NOT NULL,
  FOREIGN KEY (quiz_question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE,
  FOREIGN KEY (selected_option_id) REFERENCES quiz_options(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS quiz_answers_voter_question_idx ON quiz_answers (voter_token, quiz_question_id);
CREATE TABLE IF NOT EXISTS surveys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  is_open INTEGER DEFAULT 1 NOT NULL,
  session_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS survey_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  text TEXT NOT NULL,
  position INTEGER DEFAULT 0 NOT NULL,
  is_required INTEGER DEFAULT 0 NOT NULL,
  survey_id INTEGER NOT NULL,
  FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS survey_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  position INTEGER DEFAULT 0 NOT NULL,
  survey_question_id INTEGER NOT NULL,
  FOREIGN KEY (survey_question_id) REFERENCES survey_questions(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS survey_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voter_token TEXT NOT NULL,
  survey_id INTEGER NOT NULL,
  submitted_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS survey_responses_voter_survey_idx ON survey_responses (voter_token, survey_id);
CREATE TABLE IF NOT EXISTS survey_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  survey_response_id INTEGER NOT NULL,
  survey_question_id INTEGER NOT NULL,
  selected_option_id INTEGER,
  text_value TEXT,
  rating_value INTEGER,
  FOREIGN KEY (survey_response_id) REFERENCES survey_responses(id) ON DELETE CASCADE,
  FOREIGN KEY (survey_question_id) REFERENCES survey_questions(id) ON DELETE CASCADE,
  FOREIGN KEY (selected_option_id) REFERENCES survey_options(id) ON DELETE CASCADE
);
`;

const TABLES = [
  'survey_answers', 'survey_responses', 'survey_options', 'survey_questions', 'surveys',
  'quiz_answers', 'quiz_options', 'quiz_questions', 'quizzes',
  'poll_responses', 'poll_options', 'polls',
  'question_reactions', 'upvotes', 'replies', 'questions',
  'sessions', 'users',
];

async function applySchema(db: D1Database) {
  const statements = SCHEMA_SQL.split(';')
    .map(s => s.trim())
    .filter(Boolean);
  for (const sql of statements) {
    await db.prepare(sql).run();
  }
}

async function clearTables(db: D1Database) {
  for (const table of TABLES) {
    await db.prepare(`DELETE FROM ${table}`).run();
  }
}

async function seedSession(db: D1Database, opts: { code: string; title: string; moderated?: boolean }) {
  const result = await db.prepare(
    'INSERT INTO sessions (code, title, is_moderated) VALUES (?, ?, ?) RETURNING id'
  ).bind(opts.code, opts.title, opts.moderated ? 1 : 0).first<{ id: number }>();
  return result!.id;
}

async function seedQuestion(db: D1Database, sessionId: number, text: string, title = text) {
  const result = await db.prepare(
    'INSERT INTO questions (title, text, session_id) VALUES (?, ?, ?) RETURNING id'
  ).bind(title, text, sessionId).first<{ id: number }>();
  return result!.id;
}

async function seedPoll(db: D1Database, sessionId: number, question: string, options: string[]) {
  const poll = await db.prepare(
    "INSERT INTO polls (type, question, is_active, session_id) VALUES ('MULTIPLE_CHOICE', ?, 1, ?) RETURNING id"
  ).bind(question, sessionId).first<{ id: number }>();
  const pollId = poll!.id;
  const optionIds: number[] = [];
  for (let i = 0; i < options.length; i++) {
    const opt = await db.prepare(
      'INSERT INTO poll_options (text, position, poll_id) VALUES (?, ?, ?) RETURNING id'
    ).bind(options[i], i, pollId).first<{ id: number }>();
    optionIds.push(opt!.id);
  }
  return { pollId, optionIds };
}

async function seedQuiz(db: D1Database, sessionId: number, title: string, questions: { text: string; options: string[]; correctIndex: number }[]) {
  const quiz = await db.prepare(
    'INSERT INTO quizzes (title, is_active, session_id) VALUES (?, 1, ?) RETURNING id'
  ).bind(title, sessionId).first<{ id: number }>();
  const quizId = quiz!.id;
  const questionData: { questionId: number; optionIds: number[]; correctOptionId: number }[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const qq = await db.prepare(
      'INSERT INTO quiz_questions (text, position, quiz_id) VALUES (?, ?, ?) RETURNING id'
    ).bind(q.text, i, quizId).first<{ id: number }>();
    const qqId = qq!.id;
    const optIds: number[] = [];
    for (let j = 0; j < q.options.length; j++) {
      const opt = await db.prepare(
        'INSERT INTO quiz_options (text, position, quiz_question_id) VALUES (?, ?, ?) RETURNING id'
      ).bind(q.options[j], j, qqId).first<{ id: number }>();
      optIds.push(opt!.id);
    }
    await db.prepare('UPDATE quiz_questions SET correct_option_id = ? WHERE id = ?')
      .bind(optIds[q.correctIndex], qqId).run();
    questionData.push({ questionId: qqId, optionIds: optIds, correctOptionId: optIds[q.correctIndex] });
  }
  return { quizId, questionData };
}

function getDOStub(code: string): DurableObjectStub {
  const id = env.SESSION_DO.idFromName(code.toUpperCase());
  return env.SESSION_DO.get(id);
}

async function wsConnect(code: string): Promise<{ ws: WebSocket; firstMessage: ServerMessage }> {
  const stub = getDOStub(code);
  const resp = await stub.fetch(`https://fake-host/?code=${code}`, {
    headers: { Upgrade: 'websocket' },
  });
  expect(resp.status).toBe(101);
  const ws = resp.webSocket!;
  ws.accept();

  const firstMessage = await new Promise<ServerMessage>((resolve) => {
    ws.addEventListener('message', (event) => {
      resolve(JSON.parse(event.data as string));
    }, { once: true });
  });

  return { ws, firstMessage };
}

function nextMessage(ws: WebSocket): Promise<ServerMessage> {
  return new Promise((resolve) => {
    ws.addEventListener('message', (event) => {
      resolve(JSON.parse(event.data as string));
    }, { once: true });
  });
}

describe('SessionDO', () => {
  beforeEach(async () => {
    await applySchema(env.DB);
    await clearTables(env.DB);
  });

  describe('connection lifecycle', () => {
    it('returns error for missing code parameter', async () => {
      const stub = getDOStub('TESTCODE');
      const resp = await stub.fetch('https://fake-host/', {
        headers: { Upgrade: 'websocket' },
      });
      expect(resp.status).toBe(400);
    });

    it('returns 426 for non-WebSocket request', async () => {
      const stub = getDOStub('TESTCODE');
      const resp = await stub.fetch('https://fake-host/?code=TESTCODE');
      expect(resp.status).toBe(426);
    });

    it('returns error state for nonexistent session', async () => {
      const { ws, firstMessage } = await wsConnect('NOSESSION');
      expect(firstMessage.type).toBe('error');
      if (firstMessage.type === 'error') {
        expect(firstMessage.message).toBe('Session not found');
      }
      ws.close(1000);
    });

    it('returns full session state on connect', async () => {
      await seedSession(env.DB, { code: 'LIVE', title: 'Live Session' });
      const { ws, firstMessage } = await wsConnect('LIVE');

      expect(firstMessage.type).toBe('state');
      if (firstMessage.type === 'state') {
        const state = firstMessage.data;
        expect(state.code).toBe('LIVE');
        expect(state.title).toBe('Live Session');
        expect(state.questions).toEqual([]);
        expect(state.polls).toEqual([]);
        expect(state.quizzes).toEqual([]);
        expect(state.surveys).toEqual([]);
      }
      ws.close(1000);
    });

    it('loads existing questions and votes on connect', async () => {
      const sessionId = await seedSession(env.DB, { code: 'HASDATA', title: 'Session With Data' });
      const qId = await seedQuestion(env.DB, sessionId, 'What is Cloudflare?');
      await env.DB.prepare('INSERT INTO upvotes (voter_token, question_id, value) VALUES (?, ?, ?)')
        .bind('voter-1', qId, 1).run();
      await env.DB.prepare('INSERT INTO upvotes (voter_token, question_id, value) VALUES (?, ?, ?)')
        .bind('voter-2', qId, 1).run();

      const { ws, firstMessage } = await wsConnect('HASDATA');
      expect(firstMessage.type).toBe('state');
      if (firstMessage.type === 'state') {
        expect(firstMessage.data.questions).toHaveLength(1);
        expect(firstMessage.data.questions[0].text).toBe('What is Cloudflare?');
        expect(firstMessage.data.questions[0].upvoteCount).toBe(2);
      }
      ws.close(1000);
    });
  });

  describe('createQuestion', () => {
    it('creates a question and broadcasts to all clients', async () => {
      await seedSession(env.DB, { code: 'ASKQ', title: 'Ask Questions' });
      const { ws: ws1, firstMessage: init1 } = await wsConnect('ASKQ');
      expect(init1.type).toBe('state');

      const { ws: ws2, firstMessage: init2 } = await wsConnect('ASKQ');
      expect(init2.type).toBe('state');

      const broadcast1 = nextMessage(ws1);
      const broadcast2 = nextMessage(ws2);

      ws1.send(JSON.stringify({
        type: 'createQuestion',
        title: 'How do Durable Objects work?',
        text: 'How do Durable Objects work?',
        authorName: 'Alice',
      }));

      const [msg1, msg2] = await Promise.all([broadcast1, broadcast2]);
      expect(msg1.type).toBe('state');
      expect(msg2.type).toBe('state');

      if (msg1.type === 'state') {
        expect(msg1.data.questions).toHaveLength(1);
        expect(msg1.data.questions[0].title).toBe('How do Durable Objects work?');
        expect(msg1.data.questions[0].text).toBe('How do Durable Objects work?');
        expect(msg1.data.questions[0].authorName).toBe('Alice');
        expect(msg1.data.questions[0].isApproved).toBe(true);
      }

      // Verify persisted in D1
      const row = await env.DB.prepare('SELECT text, author_name FROM questions').first<{ text: string; author_name: string }>();
      expect(row?.text).toBe('How do Durable Objects work?');
      expect(row?.author_name).toBe('Alice');

      ws1.close(1000);
      ws2.close(1000);
    });

    it('rejects a missing title', async () => {
      await seedSession(env.DB, { code: 'EMPTY', title: 'Empty Test' });
      const { ws, firstMessage } = await wsConnect('EMPTY');
      expect(firstMessage.type).toBe('state');

      const errorMsg = nextMessage(ws);
      ws.send(JSON.stringify({ type: 'createQuestion', text: 'Optional body' }));
      const msg = await errorMsg;
      expect(msg.type).toBe('error');
      if (msg.type === 'error') {
        expect(msg.message).toBe('Title is required');
      }
      ws.close(1000);
    });

    it('rejects an 11-word title', async () => {
      await seedSession(env.DB, { code: 'TOOLONG', title: 'Title Limit Test' });
      const { ws, firstMessage } = await wsConnect('TOOLONG');
      expect(firstMessage.type).toBe('state');

      const errorMsg = nextMessage(ws);
      ws.send(JSON.stringify({
        type: 'createQuestion',
        title: 'one two three four five six seven eight nine ten eleven',
      }));
      const msg = await errorMsg;
      expect(msg.type).toBe('error');
      if (msg.type === 'error') {
        expect(msg.message).toBe('Title must be 10 words or fewer');
      }
      ws.close(1000);
    });

    it('does not auto-approve questions in moderated sessions', async () => {
      await seedSession(env.DB, { code: 'MODERATED', title: 'Moderated', moderated: true });
      const { ws, firstMessage } = await wsConnect('MODERATED');
      expect(firstMessage.type).toBe('state');

      const broadcast = nextMessage(ws);
      ws.send(JSON.stringify({ type: 'createQuestion', title: 'Pending question', text: 'Optional body' }));
      const msg = await broadcast;

      // In moderated mode, the question is inserted but NOT shown in the broadcast
      // (only approved questions appear in the state for moderated sessions)
      if (msg.type === 'state') {
        expect(msg.data.questions).toHaveLength(0);
      }

      // But it IS in D1 for moderation queue
      const row = await env.DB.prepare('SELECT is_approved FROM questions').first<{ is_approved: number }>();
      expect(row?.is_approved).toBe(0);

      ws.close(1000);
    });
  });

  describe('vote', () => {
    it('increments the selected vote count and score', async () => {
      const sessionId = await seedSession(env.DB, { code: 'VOTE', title: 'Vote Test' });
      const qId = await seedQuestion(env.DB, sessionId, 'Vote me');

      const { ws, firstMessage } = await wsConnect('VOTE');
      expect(firstMessage.type).toBe('state');
      if (firstMessage.type === 'state') {
        expect(firstMessage.data.questions[0].upvoteCount).toBe(0);
        expect(firstMessage.data.questions[0].downvoteCount).toBe(0);
        expect(firstMessage.data.questions[0].score).toBe(0);
      }

      const broadcast = nextMessage(ws);
      ws.send(JSON.stringify({ type: 'vote', questionId: qId, voterToken: 'voter-abc', value: 1 }));
      const msg = await broadcast;
      expect(msg.type).toBe('state');
      if (msg.type === 'state') {
        const question = msg.data.questions[0];
        expect(question.upvoteCount).toBe(1);
        expect(question.downvoteCount).toBe(0);
        expect(question.score).toBe(1);
      }

      ws.close(1000);
    });

    it('does not inflate counts for duplicate votes from one voter', async () => {
      const sessionId = await seedSession(env.DB, { code: 'VOTEDUP', title: 'Duplicate Vote Test' });
      const qId = await seedQuestion(env.DB, sessionId, 'Vote me');
      const { ws, firstMessage } = await wsConnect('VOTEDUP');
      expect(firstMessage.type).toBe('state');

      const firstBroadcast = nextMessage(ws);
      ws.send(JSON.stringify({ type: 'vote', questionId: qId, voterToken: 'same-voter', value: 1 }));
      const first = await firstBroadcast;
      expect(first.type).toBe('state');
      if (first.type === 'state') expect(first.data.questions[0].upvoteCount).toBe(1);

      const secondBroadcast = nextMessage(ws);
      ws.send(JSON.stringify({ type: 'vote', questionId: qId, voterToken: 'same-voter', value: 1 }));
      const second = await secondBroadcast;
      expect(second.type).toBe('state');
      if (second.type === 'state') {
        expect(second.data.questions[0].upvoteCount).toBe(0);
        expect(second.data.questions[0].score).toBe(0);
      }

      ws.close(1000);
    });

    it('switches from downvote to upvote for one voter', async () => {
      const sessionId = await seedSession(env.DB, { code: 'VOTESWITCH', title: 'Vote Switch Test' });
      const qId = await seedQuestion(env.DB, sessionId, 'Vote me');
      const { ws, firstMessage } = await wsConnect('VOTESWITCH');
      expect(firstMessage.type).toBe('state');

      const downvoteBroadcast = nextMessage(ws);
      ws.send(JSON.stringify({ type: 'vote', questionId: qId, voterToken: 'switcher', value: -1 }));
      const downvote = await downvoteBroadcast;
      expect(downvote.type).toBe('state');
      if (downvote.type === 'state') {
        expect(downvote.data.questions[0].upvoteCount).toBe(0);
        expect(downvote.data.questions[0].downvoteCount).toBe(1);
        expect(downvote.data.questions[0].score).toBe(-1);
      }

      const upvoteBroadcast = nextMessage(ws);
      ws.send(JSON.stringify({ type: 'vote', questionId: qId, voterToken: 'switcher', value: 1 }));
      const upvote = await upvoteBroadcast;
      expect(upvote.type).toBe('state');
      if (upvote.type === 'state') {
        expect(upvote.data.questions[0].upvoteCount).toBe(1);
        expect(upvote.data.questions[0].downvoteCount).toBe(0);
        expect(upvote.data.questions[0].score).toBe(1);
      }

      ws.close(1000);
    });

    it('toggles off a second identical vote', async () => {
      const sessionId = await seedSession(env.DB, { code: 'VOTEOFF', title: 'Vote Toggle Test' });
      const qId = await seedQuestion(env.DB, sessionId, 'Vote me');
      const { ws, firstMessage } = await wsConnect('VOTEOFF');
      expect(firstMessage.type).toBe('state');

      const firstBroadcast = nextMessage(ws);
      ws.send(JSON.stringify({ type: 'vote', questionId: qId, voterToken: 'toggle-voter', value: -1 }));
      await firstBroadcast;

      const secondBroadcast = nextMessage(ws);
      ws.send(JSON.stringify({ type: 'vote', questionId: qId, voterToken: 'toggle-voter', value: -1 }));
      const msg = await secondBroadcast;
      expect(msg.type).toBe('state');
      if (msg.type === 'state') {
        expect(msg.data.questions[0].upvoteCount).toBe(0);
        expect(msg.data.questions[0].downvoteCount).toBe(0);
        expect(msg.data.questions[0].score).toBe(0);
      }

      ws.close(1000);
    });

    it('rejects a vote for a nonexistent question', async () => {
      await seedSession(env.DB, { code: 'VOTEBAD', title: 'Vote Bad' });
      const { ws, firstMessage } = await wsConnect('VOTEBAD');
      expect(firstMessage.type).toBe('state');

      const errorMsg = nextMessage(ws);
      ws.send(JSON.stringify({ type: 'vote', questionId: 9999, voterToken: 'voter-x', value: 1 }));
      const msg = await errorMsg;
      expect(msg.type).toBe('error');
      if (msg.type === 'error') {
        expect(msg.message).toBe('Question not found');
      }
      ws.close(1000);
    });

    it('rejects a vote without a voter token', async () => {
      const sessionId = await seedSession(env.DB, { code: 'VOTENOTOKEN', title: 'No Token' });
      const qId = await seedQuestion(env.DB, sessionId, 'Q');

      const { ws, firstMessage } = await wsConnect('VOTENOTOKEN');
      expect(firstMessage.type).toBe('state');

      const errorMsg = nextMessage(ws);
      ws.send(JSON.stringify({ type: 'vote', questionId: qId, voterToken: '   ', value: 1 }));
      const msg = await errorMsg;
      expect(msg.type).toBe('error');
      if (msg.type === 'error') {
        expect(msg.message).toBe('Voter token required');
      }
      ws.close(1000);
    });
  });

  describe('question reactions', () => {
    it('increments then toggles off a reaction for one voter', async () => {
      const sessionId = await seedSession(env.DB, { code: 'REACT', title: 'Reaction Test' });
      const qId = await seedQuestion(env.DB, sessionId, 'React to me');
      const { ws, firstMessage } = await wsConnect('REACT');
      expect(firstMessage.type).toBe('state');

      const firstBroadcast = nextMessage(ws);
      ws.send(JSON.stringify({ type: 'react', questionId: qId, voterToken: 'reactor', emoji: 'heart' }));
      const first = await firstBroadcast;
      expect(first.type).toBe('state');
      if (first.type === 'state') {
        expect(first.data.questions[0].reactions).toEqual([{ emoji: 'heart', count: 1 }]);
      }

      const secondBroadcast = nextMessage(ws);
      ws.send(JSON.stringify({ type: 'react', questionId: qId, voterToken: 'reactor', emoji: 'heart' }));
      const second = await secondBroadcast;
      expect(second.type).toBe('state');
      if (second.type === 'state') expect(second.data.questions[0].reactions).toEqual([]);

      ws.close(1000);
    });
  });

  describe('poll response', () => {
    it('increments poll option vote count on response', async () => {
      const sessionId = await seedSession(env.DB, { code: 'POLL', title: 'Poll Test' });
      const { pollId, optionIds } = await seedPoll(env.DB, sessionId, 'Favorite color?', ['Red', 'Blue', 'Green']);

      const { ws, firstMessage } = await wsConnect('POLL');
      expect(firstMessage.type).toBe('state');
      if (firstMessage.type === 'state') {
        expect(firstMessage.data.polls).toHaveLength(1);
        expect(firstMessage.data.polls[0].responseCount).toBe(0);
      }

      const broadcast = nextMessage(ws);
      ws.send(JSON.stringify({
        type: 'submitPollResponse',
        pollId,
        voterToken: 'voter-poll-1',
        selectedOptionId: optionIds[1],
      }));

      const msg = await broadcast;
      expect(msg.type).toBe('state');
      if (msg.type === 'state') {
        const poll = msg.data.polls[0];
        expect(poll.responseCount).toBe(1);
        expect(poll.options[1].voteCount).toBe(1);
        expect(poll.options[0].voteCount).toBe(0);
      }

      ws.close(1000);
    });

    it('rejects response on inactive poll', async () => {
      const sessionId = await seedSession(env.DB, { code: 'POLLINACT', title: 'Inactive Poll' });
      const poll = await env.DB.prepare(
        "INSERT INTO polls (type, question, is_active, session_id) VALUES ('MULTIPLE_CHOICE', 'Closed poll', 0, ?) RETURNING id"
      ).bind(sessionId).first<{ id: number }>();

      const { ws, firstMessage } = await wsConnect('POLLINACT');
      expect(firstMessage.type).toBe('state');

      const errorMsg = nextMessage(ws);
      ws.send(JSON.stringify({
        type: 'submitPollResponse',
        pollId: poll!.id,
        voterToken: 'voter-x',
        selectedOptionId: 1,
      }));
      const msg = await errorMsg;
      expect(msg.type).toBe('error');
      if (msg.type === 'error') {
        expect(msg.message).toBe('Poll is not active');
      }
      ws.close(1000);
    });
  });

  describe('quiz answer', () => {
    it('scores a correct answer based on speed', async () => {
      const sessionId = await seedSession(env.DB, { code: 'QUIZ', title: 'Quiz Test' });
      const { questionData } = await seedQuiz(env.DB, sessionId, 'Trivia', [
        { text: 'What is 2+2?', options: ['3', '4', '5', '6'], correctIndex: 1 },
      ]);
      const qqId = questionData[0].questionId;
      const correctId = questionData[0].correctOptionId;

      const { ws, firstMessage } = await wsConnect('QUIZ');
      expect(firstMessage.type).toBe('state');

      const broadcast = nextMessage(ws);
      ws.send(JSON.stringify({
        type: 'submitQuizAnswer',
        quizQuestionId: qqId,
        selectedOptionId: correctId,
        voterToken: 'quizzer-1',
        answeredInMs: 5000,
      }));

      const msg = await broadcast;
      expect(msg.type).toBe('state');

      // Verify the answer was persisted with correct scoring
      const answer = await env.DB.prepare(
        'SELECT is_correct, score FROM quiz_answers WHERE quiz_question_id = ? AND voter_token = ?'
      ).bind(qqId, 'quizzer-1').first<{ is_correct: number; score: number }>();
      expect(answer?.is_correct).toBe(1);
      // score = max(100, 1000 - (5000 / 20000) * 900) = max(100, 775) = 775
      expect(answer?.score).toBe(775);

      ws.close(1000);
    });

    it('scores 0 for incorrect answer', async () => {
      const sessionId = await seedSession(env.DB, { code: 'QUIZWRONG', title: 'Wrong Answer' });
      const { questionData } = await seedQuiz(env.DB, sessionId, 'Trivia', [
        { text: 'What is 2+2?', options: ['3', '4', '5', '6'], correctIndex: 1 },
      ]);
      const qqId = questionData[0].questionId;
      const wrongId = questionData[0].optionIds[0]; // '3' is wrong

      const { ws, firstMessage } = await wsConnect('QUIZWRONG');
      expect(firstMessage.type).toBe('state');

      const broadcast = nextMessage(ws);
      ws.send(JSON.stringify({
        type: 'submitQuizAnswer',
        quizQuestionId: qqId,
        selectedOptionId: wrongId,
        voterToken: 'quizzer-wrong',
        answeredInMs: 3000,
      }));
      await broadcast;

      const answer = await env.DB.prepare(
        'SELECT is_correct, score FROM quiz_answers WHERE voter_token = ?'
      ).bind('quizzer-wrong').first<{ is_correct: number; score: number }>();
      expect(answer?.is_correct).toBe(0);
      expect(answer?.score).toBe(0);

      ws.close(1000);
    });

    it('rejects duplicate quiz answer', async () => {
      const sessionId = await seedSession(env.DB, { code: 'QUIZDUP', title: 'Dupe Answer' });
      const { questionData } = await seedQuiz(env.DB, sessionId, 'Trivia', [
        { text: 'What is 2+2?', options: ['3', '4', '5', '6'], correctIndex: 1 },
      ]);
      const qqId = questionData[0].questionId;
      const optId = questionData[0].optionIds[1];

      const { ws, firstMessage } = await wsConnect('QUIZDUP');
      expect(firstMessage.type).toBe('state');

      // First answer
      const b1 = nextMessage(ws);
      ws.send(JSON.stringify({
        type: 'submitQuizAnswer', quizQuestionId: qqId,
        selectedOptionId: optId, voterToken: 'duper', answeredInMs: 1000,
      }));
      await b1;

      // Second answer — should be rejected
      const b2 = nextMessage(ws);
      ws.send(JSON.stringify({
        type: 'submitQuizAnswer', quizQuestionId: qqId,
        selectedOptionId: optId, voterToken: 'duper', answeredInMs: 2000,
      }));
      const msg = await b2;
      expect(msg.type).toBe('error');
      if (msg.type === 'error') {
        expect(msg.message).toBe('Already answered');
      }

      ws.close(1000);
    });
  });

  describe('subscribe message', () => {
    it('re-subscribes and sends fresh state', async () => {
      await seedSession(env.DB, { code: 'RESUB', title: 'Resub Test' });
      const { ws, firstMessage } = await wsConnect('RESUB');
      expect(firstMessage.type).toBe('state');

      const resubMsg = nextMessage(ws);
      ws.send(JSON.stringify({ type: 'subscribe', code: 'RESUB' }));
      const msg = await resubMsg;
      expect(msg.type).toBe('state');
      if (msg.type === 'state') {
        expect(msg.data.code).toBe('RESUB');
      }
      ws.close(1000);
    });
  });

  describe('refresh message', () => {
    it('reloads state from D1 and broadcasts', async () => {
      const sessionId = await seedSession(env.DB, { code: 'REFRESH', title: 'Refresh Test' });
      const { ws, firstMessage } = await wsConnect('REFRESH');
      expect(firstMessage.type).toBe('state');
      if (firstMessage.type === 'state') {
        expect(firstMessage.data.questions).toHaveLength(0);
      }

      // Insert a question directly into D1 (simulating a GraphQL mutation)
      await seedQuestion(env.DB, sessionId, 'Added via GraphQL');

      const broadcast = nextMessage(ws);
      ws.send(JSON.stringify({ type: 'refresh' }));
      const msg = await broadcast;
      expect(msg.type).toBe('state');
      if (msg.type === 'state') {
        expect(msg.data.questions).toHaveLength(1);
        expect(msg.data.questions[0].text).toBe('Added via GraphQL');
      }
      ws.close(1000);
    });
  });

  describe('error handling', () => {
    it('returns error for invalid JSON', async () => {
      await seedSession(env.DB, { code: 'BADJSON', title: 'Bad JSON' });
      const { ws, firstMessage } = await wsConnect('BADJSON');
      expect(firstMessage.type).toBe('state');

      const errorMsg = nextMessage(ws);
      ws.send('not valid json{{{');
      const msg = await errorMsg;
      expect(msg.type).toBe('error');
      if (msg.type === 'error') {
        expect(msg.message).toBe('Invalid JSON');
      }
      ws.close(1000);
    });

    it('returns error for unknown message type', async () => {
      await seedSession(env.DB, { code: 'UNKNOWN', title: 'Unknown' });
      const { ws, firstMessage } = await wsConnect('UNKNOWN');
      expect(firstMessage.type).toBe('state');

      const errorMsg = nextMessage(ws);
      ws.send(JSON.stringify({ type: 'nonexistent' }));
      const msg = await errorMsg;
      expect(msg.type).toBe('error');
      if (msg.type === 'error') {
        expect(msg.message).toContain('Unknown action');
      }
      ws.close(1000);
    });
  });
});
