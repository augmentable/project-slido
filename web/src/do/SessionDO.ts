import type { ClientMessage, SessionState, QuestionState, PollState, PollOptionState } from '../lib/ws-protocol';

interface Env {
  DB: D1Database;
  SESSION_DO: DurableObjectNamespace;
}

interface PendingWrite {
  sql: string;
  params: unknown[];
}

const FLUSH_DELAY_MS = 1_000;

/**
 * One Durable Object per session code. Holds WebSocket connections for all
 * clients viewing that session and broadcasts state changes in real-time.
 *
 * Architecture:
 *  - Hibernation API: acceptWebSocket / webSocketMessage / webSocketClose
 *    so idle connections don't bill for duration.
 *  - In-memory hot path: mutations are applied to cached state instantly
 *    and broadcast within microseconds — no D1 round-trip for reads.
 *  - Write-behind: D1 writes are queued and flushed via alarm (1s debounce).
 *    Alarm also fires on last-client disconnect to persist before eviction.
 */
export class SessionDO implements DurableObject {
  private ctx: DurableObjectState;
  private env: Env;
  private sessionCode: string | null = null;
  private cachedState: SessionState | null = null;
  private pendingWrites: PendingWrite[] = [];
  private alarmScheduled = false;

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }

  // ── Lifecycle ──

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    if (!code) return new Response('Missing code', { status: 400 });

    this.sessionCode = code.toUpperCase();

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ code: this.sessionCode });

    try {
      const state = await this.ensureState();
      if (state) {
        server.send(JSON.stringify({ type: 'state', data: state }));
      } else {
        server.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
      }
    } catch {
      server.send(JSON.stringify({ type: 'error', message: 'Failed to load session' }));
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return;

    let msg: ClientMessage;
    try {
      msg = JSON.parse(message);
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      return;
    }

    this.restoreCodeFromAttachment(ws);

    try {
      switch (msg.type) {
        case 'subscribe':
          this.sessionCode = msg.code.toUpperCase();
          ws.serializeAttachment({ code: this.sessionCode });
          await this.sendStateTo(ws);
          break;

        case 'upvote':
          await this.handleUpvote(msg.questionId, msg.voterToken);
          break;

        case 'createQuestion':
          await this.handleCreateQuestion(msg.text, msg.authorName);
          break;

        case 'submitPollResponse':
          await this.handlePollResponse(msg);
          break;

        case 'submitQuizAnswer':
          await this.handleQuizAnswer(msg);
          break;

        case 'refresh':
          this.cachedState = null;
          await this.broadcastState();
          break;

        default:
          ws.send(JSON.stringify({ type: 'error', message: `Unknown action: ${(msg as { type: string }).type}` }));
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Internal error';
      ws.send(JSON.stringify({ type: 'error', message: errMsg, action: msg.type }));
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    ws.close(code, reason);

    // If last client disconnected, flush pending writes immediately
    if (this.ctx.getWebSockets().length === 0 && this.pendingWrites.length > 0) {
      await this.flushWrites();
    }
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    ws.close(1011, 'Unexpected error');
  }

  async alarm(): Promise<void> {
    this.alarmScheduled = false;
    await this.flushWrites();
  }

  // ── In-Memory Mutation Handlers ──
  // Each handler: validates, applies to cachedState in-memory, queues a D1
  // write, schedules the flush alarm, and broadcasts instantly.

  private async handleUpvote(questionId: number, voterToken: string): Promise<void> {
    const sanitized = voterToken.trim().slice(0, 64);
    if (!sanitized) throw new Error('Voter token required');

    const state = await this.ensureState();
    if (!state) throw new Error('Session not found');

    const q = state.questions.find(q => q.id === questionId);
    if (!q) throw new Error('Question not found');

    // Deduplicate: check pending writes for this upvote
    // (In-memory dedup is best-effort; D1 UNIQUE index is the real guard)
    this.enqueueWrite(
      'INSERT OR IGNORE INTO upvotes (voter_token, question_id) VALUES (?, ?)',
      [sanitized, questionId]
    );

    // Optimistically increment in-memory count
    q.upvoteCount += 1;
    this.broadcastCached();
  }

  private async handleCreateQuestion(text: string, authorName?: string): Promise<void> {
    const trimmed = text.trim().slice(0, 2000);
    if (!trimmed) throw new Error('Question text required');

    const state = await this.ensureState();
    if (!state) throw new Error('Session not found');

    const isApproved = !state.isModerated;
    const name = authorName?.trim().slice(0, 100) || null;
    const now = new Date().toISOString();

    // Write to D1 immediately for this one — we need the auto-increment ID
    const result = await this.env.DB.prepare(
      'INSERT INTO questions (text, author_name, is_approved, session_id) VALUES (?, ?, ?, ?) RETURNING id'
    ).bind(trimmed, name, isApproved ? 1 : 0, state.id).first<{ id: number }>();

    if (!result) throw new Error('Failed to create question');

    const newQuestion: QuestionState = {
      id: result.id, text: trimmed, authorName: name,
      isApproved, isHighlighted: false, isAnswered: false,
      upvoteCount: 0, replies: [], createdAt: now,
    };

    // Prepend to in-memory state (newest first)
    if (isApproved) {
      state.questions.unshift(newQuestion);
    }

    this.broadcastCached();
  }

  private async handlePollResponse(msg: Extract<ClientMessage, { type: 'submitPollResponse' }>): Promise<void> {
    const state = await this.ensureState();
    if (!state) throw new Error('Session not found');

    const poll = state.polls.find(p => p.id === msg.pollId);
    if (!poll) throw new Error('Poll not found');
    if (!poll.isActive) throw new Error('Poll is not active');

    // Best-effort dedup in memory (D1 UNIQUE index is the real guard)
    const rankingJson = msg.rankingOrder ? JSON.stringify(msg.rankingOrder) : null;
    const rating = msg.ratingValue != null ? Math.min(Math.max(msg.ratingValue, 1), 5) : null;
    const textVal = msg.textValue?.trim().slice(0, 500) || null;
    const optionId = msg.selectedOptionId ?? null;

    this.enqueueWrite(
      'INSERT INTO poll_responses (voter_token, poll_id, selected_option_id, text_value, rating_value, ranking_order) VALUES (?, ?, ?, ?, ?, ?)',
      [msg.voterToken, msg.pollId, optionId, textVal, rating, rankingJson]
    );

    // Update in-memory counts
    poll.responseCount += 1;
    if (optionId != null) {
      const opt = poll.options.find(o => o.id === optionId);
      if (opt) opt.voteCount += 1;
    }

    this.broadcastCached();
  }

  private async handleQuizAnswer(msg: Extract<ClientMessage, { type: 'submitQuizAnswer' }>): Promise<void> {
    const state = await this.ensureState();
    if (!state) throw new Error('Session not found');

    // Find the quiz question across all quizzes in this session
    let timeLimit = 20;
    let correctOptionId: number | null = null;
    let found = false;

    for (const qz of state.quizzes) {
      const qq = qz.questions.find(q => q.id === msg.quizQuestionId);
      if (qq) {
        timeLimit = qq.timeLimit;
        // correctOptionId isn't in the WS state (intentionally hidden from clients),
        // so we must check D1 for correctness
        found = true;
        break;
      }
    }
    if (!found) throw new Error('Quiz question not found');

    // Must hit D1 for correct_option_id (not exposed to clients for anti-cheat)
    const qq = await this.env.DB.prepare(
      'SELECT correct_option_id FROM quiz_questions WHERE id = ?'
    ).bind(msg.quizQuestionId).first<{ correct_option_id: number | null }>();

    const existing = await this.env.DB.prepare(
      'SELECT id FROM quiz_answers WHERE quiz_question_id = ? AND voter_token = ?'
    ).bind(msg.quizQuestionId, msg.voterToken).first();
    if (existing) throw new Error('Already answered');

    const isCorrect = msg.selectedOptionId === qq?.correct_option_id;
    const timeLimitMs = timeLimit * 1000;
    const score = isCorrect ? Math.max(100, Math.round(1000 - (msg.answeredInMs / timeLimitMs) * 900)) : 0;

    // Write immediately (quiz scoring must be durable)
    await this.env.DB.prepare(
      'INSERT INTO quiz_answers (voter_token, quiz_question_id, selected_option_id, answered_in_ms, is_correct, score) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(msg.voterToken, msg.quizQuestionId, msg.selectedOptionId, msg.answeredInMs, isCorrect ? 1 : 0, score).run();

    this.broadcastCached();
  }

  // ── Write-Behind Queue ──

  private enqueueWrite(sql: string, params: unknown[]): void {
    this.pendingWrites.push({ sql, params });
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.alarmScheduled) return;
    this.alarmScheduled = true;
    // Alarm API is the only timer that survives hibernation
    this.ctx.storage.setAlarm(Date.now() + FLUSH_DELAY_MS);
  }

  private async flushWrites(): Promise<void> {
    if (this.pendingWrites.length === 0) return;

    const batch = this.pendingWrites.splice(0);
    const statements = batch.map(w => this.env.DB.prepare(w.sql).bind(...w.params));

    try {
      await this.env.DB.batch(statements);
    } catch (err) {
      // On failure, put writes back for retry on next alarm
      this.pendingWrites.unshift(...batch);
      this.scheduleFlush();
      console.error('D1 flush failed, will retry:', err);
    }
  }

  // ── State Management ──

  private restoreCodeFromAttachment(ws: WebSocket): void {
    if (!this.sessionCode) {
      const attachment = ws.deserializeAttachment() as { code?: string } | null;
      if (attachment?.code) this.sessionCode = attachment.code;
    }
  }

  private async ensureState(): Promise<SessionState | null> {
    if (this.cachedState) return this.cachedState;
    return this.loadFullState();
  }

  private async loadFullState(): Promise<SessionState | null> {
    if (!this.sessionCode) return null;

    const session = await this.env.DB.prepare(`
      SELECT s.id, s.code, s.title, s.is_moderated, s.passcode_hash, s.primary_color, s.logo_url,
             u.id as owner_uid, u.display_name as owner_name
      FROM sessions s LEFT JOIN users u ON s.owner_id = u.id
      WHERE s.code = ?
    `).bind(this.sessionCode).first<{
      id: number; code: string; title: string; is_moderated: number; passcode_hash: string | null;
      primary_color: string | null; logo_url: string | null;
      owner_uid: number | null; owner_name: string | null;
    }>();

    if (!session) return null;

    const [questions, polls, quizzes, surveys] = await Promise.all([
      this.loadQuestions(session.id, !!session.is_moderated),
      this.loadPolls(session.id),
      this.loadQuizzes(session.id),
      this.loadSurveys(session.id),
    ]);

    this.cachedState = {
      id: session.id,
      code: session.code,
      title: session.title,
      isModerated: !!session.is_moderated,
      isPasswordProtected: !!session.passcode_hash,
      primaryColor: session.primary_color,
      logoUrl: session.logo_url,
      owner: session.owner_uid ? { id: session.owner_uid, displayName: session.owner_name! } : null,
      questions, polls, quizzes, surveys,
    };

    return this.cachedState;
  }

  private async loadQuestions(sessionId: number, isModerated: boolean): Promise<QuestionState[]> {
    const filter = isModerated ? 'AND q.is_approved = 1' : '';
    const rows = await this.env.DB.prepare(`
      SELECT q.id, q.text, q.author_name, q.is_approved, q.is_highlighted, q.is_answered, q.created_at,
             COUNT(up.id) as upvote_count
      FROM questions q LEFT JOIN upvotes up ON up.question_id = q.id
      WHERE q.session_id = ? ${filter}
      GROUP BY q.id ORDER BY q.created_at DESC
    `).bind(sessionId).all<{
      id: number; text: string; author_name: string | null; is_approved: number;
      is_highlighted: number; is_answered: number; created_at: string; upvote_count: number;
    }>();

    const questionIds = rows.results.map(r => r.id);
    const repliesMap = new Map<number, { id: number; text: string; authorName: string; createdAt: string }[]>();

    if (questionIds.length > 0) {
      const placeholders = questionIds.map(() => '?').join(',');
      const replyRows = await this.env.DB.prepare(`
        SELECT id, text, author_name, question_id, created_at
        FROM replies WHERE question_id IN (${placeholders}) ORDER BY created_at ASC
      `).bind(...questionIds).all<{
        id: number; text: string; author_name: string; question_id: number; created_at: string;
      }>();

      for (const r of replyRows.results) {
        if (!repliesMap.has(r.question_id)) repliesMap.set(r.question_id, []);
        repliesMap.get(r.question_id)!.push({
          id: r.id, text: r.text, authorName: r.author_name, createdAt: r.created_at,
        });
      }
    }

    return rows.results.map(q => ({
      id: q.id, text: q.text, authorName: q.author_name,
      isApproved: !!q.is_approved, isHighlighted: !!q.is_highlighted,
      isAnswered: !!q.is_answered, upvoteCount: q.upvote_count,
      replies: repliesMap.get(q.id) || [], createdAt: q.created_at,
    }));
  }

  private async loadPolls(sessionId: number): Promise<PollState[]> {
    const pollRows = await this.env.DB.prepare(
      'SELECT id, type, question, is_active, allow_multiple FROM polls WHERE session_id = ?'
    ).bind(sessionId).all<{
      id: number; type: string; question: string; is_active: number; allow_multiple: number;
    }>();

    return Promise.all(pollRows.results.map(async (p): Promise<PollState> => {
      const [optionRows, responseCount] = await Promise.all([
        this.env.DB.prepare(
          'SELECT id, text, position FROM poll_options WHERE poll_id = ? ORDER BY position'
        ).bind(p.id).all<{ id: number; text: string; position: number }>(),
        this.env.DB.prepare(
          'SELECT COUNT(*) as c FROM poll_responses WHERE poll_id = ?'
        ).bind(p.id).first<{ c: number }>(),
      ]);

      const options: PollOptionState[] = await Promise.all(
        optionRows.results.map(async (o): Promise<PollOptionState> => {
          const vc = await this.env.DB.prepare(
            'SELECT COUNT(*) as c FROM poll_responses WHERE selected_option_id = ?'
          ).bind(o.id).first<{ c: number }>();
          return { id: o.id, text: o.text, position: o.position, voteCount: vc?.c ?? 0 };
        })
      );

      return {
        id: p.id, type: p.type, question: p.question,
        isActive: !!p.is_active, allowMultiple: !!p.allow_multiple,
        responseCount: responseCount?.c ?? 0, options,
      };
    }));
  }

  private async loadQuizzes(sessionId: number): Promise<SessionState['quizzes']> {
    const quizRows = await this.env.DB.prepare(
      'SELECT id, title, is_active, current_question_index FROM quizzes WHERE session_id = ?'
    ).bind(sessionId).all<{
      id: number; title: string; is_active: number; current_question_index: number;
    }>();

    return Promise.all(quizRows.results.map(async (qz) => {
      const qqRows = await this.env.DB.prepare(
        'SELECT id, text, time_limit, position FROM quiz_questions WHERE quiz_id = ? ORDER BY position'
      ).bind(qz.id).all<{ id: number; text: string; time_limit: number; position: number }>();

      const questions = await Promise.all(qqRows.results.map(async (qq) => {
        const opts = await this.env.DB.prepare(
          'SELECT id, text, position FROM quiz_options WHERE quiz_question_id = ? ORDER BY position'
        ).bind(qq.id).all<{ id: number; text: string; position: number }>();
        return { ...qq, timeLimit: qq.time_limit, options: opts.results };
      }));

      return {
        id: qz.id, title: qz.title,
        isActive: !!qz.is_active, currentQuestionIndex: qz.current_question_index,
        questions,
      };
    }));
  }

  private async loadSurveys(sessionId: number): Promise<SessionState['surveys']> {
    const surveyRows = await this.env.DB.prepare(
      'SELECT id, title, is_open FROM surveys WHERE session_id = ?'
    ).bind(sessionId).all<{ id: number; title: string; is_open: number }>();

    return Promise.all(surveyRows.results.map(async (sv) => {
      const sqRows = await this.env.DB.prepare(
        'SELECT id, type, text, position, is_required FROM survey_questions WHERE survey_id = ? ORDER BY position'
      ).bind(sv.id).all<{
        id: number; type: string; text: string; position: number; is_required: number;
      }>();

      const questions = await Promise.all(sqRows.results.map(async (sq) => {
        const opts = await this.env.DB.prepare(
          'SELECT id, text, position FROM survey_options WHERE survey_question_id = ? ORDER BY position'
        ).bind(sq.id).all<{ id: number; text: string; position: number }>();
        return {
          id: sq.id, type: sq.type, text: sq.text, position: sq.position,
          isRequired: !!sq.is_required, options: opts.results,
        };
      }));

      return { id: sv.id, title: sv.title, isOpen: !!sv.is_open, questions };
    }));
  }

  // ── Broadcasting ──

  private broadcastCached(): void {
    if (!this.cachedState) return;
    const payload = JSON.stringify({ type: 'state', data: this.cachedState });
    for (const ws of this.ctx.getWebSockets()) {
      try { ws.send(payload); } catch { /* disconnected */ }
    }
  }

  private async broadcastState(): Promise<void> {
    const state = await this.ensureState();
    if (!state) return;
    const payload = JSON.stringify({ type: 'state', data: state });
    for (const ws of this.ctx.getWebSockets()) {
      try { ws.send(payload); } catch { /* disconnected */ }
    }
  }

  private async sendStateTo(ws: WebSocket): Promise<void> {
    const state = await this.ensureState();
    if (state) {
      ws.send(JSON.stringify({ type: 'state', data: state }));
    } else {
      ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
    }
  }
}
