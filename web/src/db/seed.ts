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
    'replies', 'question_reactions', 'upvotes', 'questions', 'sessions', 'users',
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
    title: 'lotf discussion ideas',
    code: 'SLIDODEV',
    isModerated: false,
    ownerId: host.id,
  }).returning().get();

  // ── Questions ──
  const questionsData = [
    {
      title: 'Minimum viable intelligence vs intelligencemaxing',
      text: 'i would like to discuss the strategy of using the minimum viable intelligence for tasks going forward, as perhaps a worker whose intelligence barely crosses the bar for the task will follow instructions best and communicate most plainly.\n\nas opposed to intelligencemaxing, where on the upside you may get a genius who does things in an elegant and efficient way but on the downside might instead do midwit overengineering and communicate with you in a faux-intelligent way that gives you a headache',
      authorName: null,
      upvotes: 1,
    },
    {
      title: 'Enforcing clean code on agent output',
      text: 'Best effective ways to enforce clean code principles on agent output.\n\nStatic analyzers like SonarQube?\nAgentic code review passes?\nSkills with lots of instructions?\n\nWhat actually works and performs great vs. hype/speculation.',
      authorName: 'Omer Gilad',
      upvotes: 1,
    },
    {
      title: 'Are models too smart for humans',
      text: 'Are modern models becoming too smart for humans to work with?\n\nOpus 5 / GPT5.6 Sol outputting incomprehensible condensed English with jargon, we need to add special instructions such as Simplified Technical English or new skills to humanize them.\n\nWill we get to the point that models create implementations and architecture that we can\'t understand and own?',
      authorName: 'Omer Gilad',
      upvotes: 1,
    },
    {
      title: 'Better password and token management',
      text: 'What are the easy ways to manage passwords/tokrns better than all in one .env.local? Split into multiple env2.local etc? How to prevent agents from accessing?',
      authorName: 'Slava',
      upvotes: 1,
    },
    {
      title: 'Vercel agent software factory',
      text: "vercel's agent software factory. template to copy? notice big problems?\n\nhttps://vercel.com/blog/building-a-software-factory-for-ai-sdk",
      authorName: 'nick',
      upvotes: 1,
    },
    {
      title: 'Long session vs new session strategies',
      text: 'agent strategies:\n1. one long running session to manage a concern/project - gpt style\n2. creating new sessions per concern\n3. others??',
      authorName: 'nick',
      upvotes: 1,
    },
    {
      title: 'Agent app architectures compared',
      text: 'agent app architectures: grok bot (cursor shared computer paired with remote agents) vs cloudflare OS vs claude tag',
      authorName: 'nick',
      upvotes: 1,
    },
    {
      title: 'Remote agents: orbs and others',
      text: 'remote agents: "orbs", exe dev, cursor agents, others',
      authorName: 'nick',
      upvotes: 1,
    },
  ];

  const savedQuestions: { id: number }[] = [];
  for (const qd of questionsData) {
    const q = db.insert(schema.questions).values({
      title: qd.title,
      text: qd.text,
      authorName: qd.authorName,
      isApproved: true,
      isHighlighted: false,
      isAnswered: false,
      sessionId: session.id,
    }).returning().get();
    savedQuestions.push(q);

    const voterCount = Math.min(qd.upvotes, VOTER_TOKENS.length);
    for (let i = 0; i < voterCount; i++) {
      db.insert(schema.upvotes).values({ voterToken: VOTER_TOKENS[i], questionId: q.id }).run();
    }
  }

  // ── Replies ──
  // No host replies on the live discussion seed.

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
