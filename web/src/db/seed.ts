import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { sql } from 'drizzle-orm';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

function hash(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

const VOTER_TOKENS = [
  'voter-alice-uuid', 'voter-bob-uuid', 'voter-carol-uuid',
  'voter-dave-uuid', 'voter-eve-uuid', 'voter-frank-uuid',
  'voter-grace-uuid', 'voter-heidi-uuid',
];

function findD1Database(): string {
  const d1Dir = join(process.cwd(), '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
  const files = readdirSync(d1Dir).filter(f => f.endsWith('.sqlite') && f !== 'metadata.sqlite');
  if (!files.length) throw new Error('No D1 database found. Run `npm run db:migrate` first.');
  return join(d1Dir, files[0]);
}

function seed() {
  const dbPath = findD1Database();
  console.log('Using database:', dbPath);
  const sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');

  const db = drizzle(sqliteDb, { schema });

  const tables = [
    'survey_answers', 'survey_responses', 'survey_options', 'survey_questions', 'surveys',
    'quiz_answers', 'quiz_options', 'quiz_questions', 'quizzes',
    'poll_responses', 'poll_options', 'polls',
    'replies', 'upvotes', 'questions', 'sessions', 'users',
  ];
  for (const t of tables) {
    sqliteDb.exec(`DELETE FROM ${t}`);
  }
  console.log('Tables cleared');

  // ── Users ──
  const host = db.insert(schema.users).values({
    email: 'host@slido.dev',
    passwordHash: hash('password123'),
    displayName: 'Sarah Chen',
  }).returning().get();

  db.insert(schema.users).values({
    email: 'alice@team.dev',
    passwordHash: hash('password123'),
    displayName: 'Alice Park',
  }).run();

  // ── Session ──
  const session = db.insert(schema.sessions).values({
    title: 'Slido Clone: Feature Prioritization',
    code: 'SLIDODEV',
    isModerated: false,
    ownerId: host.id,
  }).returning().get();

  // ── Questions ──
  const questionsData = [
    { text: 'Should we prioritize real-time collaboration features like Google Docs-style co-editing of polls, or keep the current single-author model?', authorName: 'Alice Park', upvotes: 12, highlighted: true },
    { text: 'How are we planning to handle user authentication? JWT tokens seem fine for an MVP, but should we consider OAuth2 with Google/GitHub for a smoother sign-up experience?', authorName: 'Bob Martinez', upvotes: 18, answered: true },
    { text: 'The word cloud feature looks cool but feels like a nice-to-have. Can we defer it and focus on getting the presenter mode right first?', authorName: 'Carol Davis', upvotes: 9 },
    { text: 'What about mobile responsiveness? I tried the app on my phone and the quiz timer buttons are tiny. Should we adopt a mobile-first approach?', authorName: 'Dave Wilson', upvotes: 15 },
    { text: 'Can we add a "duplicate session" feature? As a host I want to reuse my poll/quiz templates across different meetings without recreating everything.', authorName: 'Eve Thompson', upvotes: 22 },
    { text: 'The analytics dashboard is great but lacks export to PDF. CSV is fine for data nerds but most managers want a nice visual report. Worth adding?', authorName: 'Frank Lee', upvotes: 7 },
    { text: "Has anyone thought about accessibility? Screen readers can't navigate the quiz countdown timer properly. We should add ARIA labels.", authorName: 'Grace Kim', upvotes: 14 },
    { text: 'Integration with Slack would be massive. Imagine getting a notification when someone asks a question in your session. Is this feasible with webhooks?', authorName: null, upvotes: 11 },
    { text: 'For the ranking poll type, can we add drag-and-drop reordering? The current click-to-rank feels clunky compared to what Mentimeter offers.', authorName: 'Alice Park', upvotes: 6 },
    { text: "Should we consider adding a \"hand raise\" feature alongside Q&A? In hybrid meetings, remote participants often get overlooked.", authorName: 'Heidi Nakamura', upvotes: 8 },
    { text: "What's our strategy for handling concurrent sessions? If 500 people join at once, will the WebSocket server hold up?", authorName: 'Bob Martinez', upvotes: 19 },
    { text: 'Can we add emoji reactions to questions instead of just upvotes? Something like thumbs-up, heart, laughing, thinking would give richer signal about audience sentiment.', authorName: 'Carol Davis', upvotes: 5 },
  ];

  const savedQuestions: { id: number }[] = [];
  for (const qd of questionsData) {
    const q = db.insert(schema.questions).values({
      text: qd.text,
      authorName: qd.authorName,
      isApproved: true,
      isHighlighted: qd.highlighted ?? false,
      isAnswered: qd.answered ?? false,
      sessionId: session.id,
    }).returning().get();
    savedQuestions.push(q);

    const voterCount = Math.min(qd.upvotes, VOTER_TOKENS.length);
    for (let i = 0; i < voterCount; i++) {
      db.insert(schema.upvotes).values({ voterToken: VOTER_TOKENS[i], questionId: q.id }).run();
    }
  }

  // ── Replies ──
  db.insert(schema.replies).values([
    { text: 'Great question! We decided on JWT for the MVP, with OAuth2 (Google + GitHub) planned for v2. The auth system is now live with email/password.', authorName: 'Sarah Chen', questionId: savedQuestions[1].id },
    { text: "Agreed on mobile — I've filed this as a high priority. We'll do a responsive pass before the next demo.", authorName: 'Sarah Chen', questionId: savedQuestions[3].id },
    { text: 'Session templates are a great idea. Adding to the Phase 2 backlog. For now you can manually recreate, but a "clone session" button is coming.', authorName: 'Sarah Chen', questionId: savedQuestions[4].id },
    { text: "We're using graphql-ws with an in-memory PubSub which won't scale past a single server. For production we'd need Redis PubSub. Good call to flag this early.", authorName: 'Bob Martinez', questionId: savedQuestions[10].id },
  ]).run();

  // ── Poll 1: Multiple Choice ──
  const poll1 = db.insert(schema.polls).values({
    type: 'MULTIPLE_CHOICE', question: 'Which feature should we build next?', isActive: true, sessionId: session.id,
  }).returning().get();

  const p1Options = db.insert(schema.pollOptions).values([
    { text: 'Presenter / Display Mode', position: 0, pollId: poll1.id },
    { text: 'User Authentication (OAuth)', position: 1, pollId: poll1.id },
    { text: 'Mobile Responsive Redesign', position: 2, pollId: poll1.id },
    { text: 'Slack / Teams Integration', position: 3, pollId: poll1.id },
    { text: 'Session Templates & Cloning', position: 4, pollId: poll1.id },
  ]).returning().all();

  const p1Votes = [5, 3, 4, 2, 3];
  for (let optIdx = 0; optIdx < p1Options.length; optIdx++) {
    for (let v = 0; v < p1Votes[optIdx]; v++) {
      db.insert(schema.pollResponses).values({
        pollId: poll1.id, voterToken: `poll1-voter-${optIdx}-${v}`, selectedOptionId: p1Options[optIdx].id,
      }).run();
    }
  }

  // ── Poll 2: Rating ──
  const poll2 = db.insert(schema.polls).values({
    type: 'RATING', question: 'How satisfied are you with the current Q&A experience?', isActive: false, sessionId: session.id,
  }).returning().get();

  const ratings = [4, 5, 3, 4, 5, 4, 3, 5];
  for (let i = 0; i < 8; i++) {
    db.insert(schema.pollResponses).values({
      pollId: poll2.id, voterToken: VOTER_TOKENS[i], ratingValue: ratings[i],
    }).run();
  }

  // ── Poll 3: Word Cloud ──
  const poll3 = db.insert(schema.polls).values({
    type: 'WORD_CLOUD', question: 'Describe this project in one word', isActive: true, sessionId: session.id,
  }).returning().get();

  const words = ['ambitious', 'exciting', 'promising', 'ambitious', 'innovative', 'fun', 'complex', 'ambitious', 'cool', 'fast', 'exciting', 'promising', 'elegant', 'exciting', 'bold'];
  for (let i = 0; i < words.length; i++) {
    db.insert(schema.pollResponses).values({
      pollId: poll3.id, voterToken: `wc-voter-${i}`, textValue: words[i],
    }).run();
  }

  // ── Quiz ──
  const quiz = db.insert(schema.quizzes).values({
    title: 'Slido Product Knowledge Quiz', isActive: false, currentQuestionIndex: -1, sessionId: session.id,
  }).returning().get();

  const quizQuestionsData = [
    { text: 'How many poll types does the real Slido support?', options: ['3', '5', '7', '10'], correctIndex: 1, timeLimit: 15 },
    { text: 'What technology does our clone use for real-time subscriptions?', options: ['Socket.io', 'Server-Sent Events', 'graphql-ws', 'Long Polling'], correctIndex: 2, timeLimit: 15 },
    { text: 'Which company acquired Slido in 2021?', options: ['Microsoft', 'Cisco', 'Zoom', 'Google'], correctIndex: 1, timeLimit: 20 },
    { text: 'What ORM does our backend use?', options: ['Prisma', 'Drizzle', 'TypeORM', 'Sequelize'], correctIndex: 2, timeLimit: 10 },
  ];

  for (let qi = 0; qi < quizQuestionsData.length; qi++) {
    const qd = quizQuestionsData[qi];
    const qq = db.insert(schema.quizQuestions).values({
      text: qd.text, timeLimit: qd.timeLimit, position: qi, quizId: quiz.id,
    }).returning().get();

    const options = db.insert(schema.quizOptions).values(
      qd.options.map((text, i) => ({ text, position: i, quizQuestionId: qq.id }))
    ).returning().all();

    db.update(schema.quizQuestions).set({ correctOptionId: options[qd.correctIndex].id }).where(sql`id = ${qq.id}`).run();

    for (let vi = 0; vi < 6; vi++) {
      const pickedIdx = vi < 4 ? qd.correctIndex : (qd.correctIndex + 1) % 4;
      const ms = 3000 + Math.floor(Math.random() * 8000);
      const isCorrect = pickedIdx === qd.correctIndex;
      db.insert(schema.quizAnswers).values({
        quizQuestionId: qq.id,
        selectedOptionId: options[pickedIdx].id,
        voterToken: VOTER_TOKENS[vi],
        answeredInMs: ms,
        isCorrect,
        score: isCorrect ? Math.max(100, Math.round(1000 - (ms / (qd.timeLimit * 1000)) * 900)) : 0,
      }).run();
    }
  }

  // ── Survey ──
  const survey = db.insert(schema.surveys).values({
    title: 'Sprint Retrospective: Feature Development', isOpen: true, sessionId: session.id,
  }).returning().get();

  const sq1 = db.insert(schema.surveyQuestions).values({
    type: 'RATING', text: 'How would you rate the overall development velocity this sprint?', position: 0, isRequired: true, surveyId: survey.id,
  }).returning().get();

  const sq2 = db.insert(schema.surveyQuestions).values({
    type: 'MULTIPLE_CHOICE', text: 'What was the biggest blocker this sprint?', position: 1, isRequired: true, surveyId: survey.id,
  }).returning().get();

  const sq2Options = db.insert(schema.surveyOptions).values([
    { text: 'Unclear requirements', position: 0, surveyQuestionId: sq2.id },
    { text: 'Technical debt', position: 1, surveyQuestionId: sq2.id },
    { text: 'Dependency on other teams', position: 2, surveyQuestionId: sq2.id },
    { text: 'No major blockers', position: 3, surveyQuestionId: sq2.id },
  ]).returning().all();

  const sq3 = db.insert(schema.surveyQuestions).values({
    type: 'OPEN_TEXT', text: 'What should we start, stop, or continue doing?', position: 2, isRequired: false, surveyId: survey.id,
  }).returning().get();

  const surveyFeedback = [
    { rating: 4, blockerIdx: 1, text: 'Start: automated testing. Stop: skipping code reviews. Continue: daily standups.' },
    { rating: 3, blockerIdx: 0, text: 'We need better specs before jumping into implementation. The poll feature had 3 rewrites.' },
    { rating: 5, blockerIdx: 3, text: "Great sprint! The quiz feature turned out really well. Let's keep this momentum." },
    { rating: 4, blockerIdx: 2, text: 'Start: design reviews. The word cloud visualization needs UX input before we build it.' },
    { rating: 3, blockerIdx: 1, text: 'Continue: pair programming. Stop: deploying on Fridays.' },
  ];

  for (let ri = 0; ri < surveyFeedback.length; ri++) {
    const fb = surveyFeedback[ri];
    const sr = db.insert(schema.surveyResponses).values({
      surveyId: survey.id, voterToken: VOTER_TOKENS[ri],
    }).returning().get();

    db.insert(schema.surveyAnswers).values([
      { surveyResponseId: sr.id, surveyQuestionId: sq1.id, ratingValue: fb.rating },
      { surveyResponseId: sr.id, surveyQuestionId: sq2.id, selectedOptionId: sq2Options[fb.blockerIdx].id },
      { surveyResponseId: sr.id, surveyQuestionId: sq3.id, textValue: fb.text },
    ]).run();
  }

  console.log('Seed complete!');
  console.log(`  Session: ${session.code} (id: ${session.id})`);
  console.log(`  Host login: host@slido.dev / password123`);
  console.log(`  Questions: ${savedQuestions.length}`);
  console.log(`  Polls: 3 (MC, Rating, Word Cloud)`);
  console.log(`  Quiz: 1 (${quizQuestionsData.length} questions)`);
  console.log(`  Survey: 1 (${surveyFeedback.length} responses)`);

  sqliteDb.close();
}

seed();
