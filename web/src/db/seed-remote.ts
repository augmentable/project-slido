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

const VOTER_TOKENS = [
  'voter-alice-uuid', 'voter-bob-uuid', 'voter-carol-uuid',
  'voter-dave-uuid', 'voter-eve-uuid', 'voter-frank-uuid',
  'voter-grace-uuid', 'voter-heidi-uuid',
];

const lines: string[] = [];
const emit = (sql: string) => lines.push(sql);

// ── Clear tables ──
const tables = [
  'survey_answers', 'survey_responses', 'survey_options', 'survey_questions', 'surveys',
  'quiz_answers', 'quiz_options', 'quiz_questions', 'quizzes',
  'poll_responses', 'poll_options', 'polls',
  'replies', 'upvotes', 'questions', 'sessions', 'users',
];
for (const t of tables) emit(`DELETE FROM ${t};`);

// ── Users ──
const passwordHash = hash('password123');
emit(`INSERT INTO users (id, email, password_hash, display_name) VALUES (1, 'host@slido.dev', '${passwordHash}', 'Sarah Chen');`);
emit(`INSERT INTO users (id, email, password_hash, display_name) VALUES (2, 'alice@team.dev', '${passwordHash}', 'Alice Park');`);

// ── Session ──
emit(`INSERT INTO sessions (id, code, title, is_moderated, owner_id) VALUES (1, 'SLIDODEV', 'Slido Clone: Feature Prioritization', 0, 1);`);

// ── Questions ──
const questionsData = [
  { text: 'Should we prioritize real-time collaboration features like Google Docs-style co-editing of polls, or keep the current single-author model?', authorName: 'Alice Park', upvotes: 12, highlighted: true, answered: false },
  { text: 'How are we planning to handle user authentication? JWT tokens seem fine for an MVP, but should we consider OAuth2 with Google/GitHub for a smoother sign-up experience?', authorName: 'Bob Martinez', upvotes: 18, highlighted: false, answered: true },
  { text: 'The word cloud feature looks cool but feels like a nice-to-have. Can we defer it and focus on getting the presenter mode right first?', authorName: 'Carol Davis', upvotes: 9, highlighted: false, answered: false },
  { text: 'What about mobile responsiveness? I tried the app on my phone and the quiz timer buttons are tiny. Should we adopt a mobile-first approach?', authorName: 'Dave Wilson', upvotes: 15, highlighted: false, answered: false },
  { text: 'Can we add a "duplicate session" feature? As a host I want to reuse my poll/quiz templates across different meetings without recreating everything.', authorName: 'Eve Thompson', upvotes: 22, highlighted: false, answered: false },
  { text: 'The analytics dashboard is great but lacks export to PDF. CSV is fine for data nerds but most managers want a nice visual report. Worth adding?', authorName: 'Frank Lee', upvotes: 7, highlighted: false, answered: false },
  { text: "Has anyone thought about accessibility? Screen readers can't navigate the quiz countdown timer properly. We should add ARIA labels.", authorName: 'Grace Kim', upvotes: 14, highlighted: false, answered: false },
  { text: 'Integration with Slack would be massive. Imagine getting a notification when someone asks a question in your session. Is this feasible with webhooks?', authorName: null, upvotes: 11, highlighted: false, answered: false },
  { text: 'For the ranking poll type, can we add drag-and-drop reordering? The current click-to-rank feels clunky compared to what Mentimeter offers.', authorName: 'Alice Park', upvotes: 6, highlighted: false, answered: false },
  { text: 'Should we consider adding a "hand raise" feature alongside Q&A? In hybrid meetings, remote participants often get overlooked.', authorName: 'Heidi Nakamura', upvotes: 8, highlighted: false, answered: false },
  { text: "What's our strategy for handling concurrent sessions? If 500 people join at once, will the WebSocket server hold up?", authorName: 'Bob Martinez', upvotes: 19, highlighted: false, answered: false },
  { text: 'Can we add emoji reactions to questions instead of just upvotes? Something like thumbs-up, heart, laughing, thinking would give richer signal about audience sentiment.', authorName: 'Carol Davis', upvotes: 5, highlighted: false, answered: false },
];

for (let i = 0; i < questionsData.length; i++) {
  const q = questionsData[i];
  const qId = i + 1;
  const authorVal = q.authorName ? `'${esc(q.authorName)}'` : 'NULL';
  emit(`INSERT INTO questions (id, text, author_name, is_approved, is_highlighted, is_answered, session_id) VALUES (${qId}, '${esc(q.text)}', ${authorVal}, 1, ${q.highlighted ? 1 : 0}, ${q.answered ? 1 : 0}, 1);`);

  const voterCount = Math.min(q.upvotes, VOTER_TOKENS.length);
  for (let vi = 0; vi < voterCount; vi++) {
    emit(`INSERT INTO upvotes (voter_token, question_id) VALUES ('${VOTER_TOKENS[vi]}', ${qId});`);
  }
}

// ── Replies (questions are 1-indexed: q2=id2, q4=id4, q5=id5, q11=id11) ──
const repliesData = [
  { text: 'Great question! We decided on JWT for the MVP, with OAuth2 (Google + GitHub) planned for v2. The auth system is now live with email/password.', authorName: 'Sarah Chen', questionId: 2 },
  { text: "Agreed on mobile — I've filed this as a high priority. We'll do a responsive pass before the next demo.", authorName: 'Sarah Chen', questionId: 4 },
  { text: 'Session templates are a great idea. Adding to the Phase 2 backlog. For now you can manually recreate, but a "clone session" button is coming.', authorName: 'Sarah Chen', questionId: 5 },
  { text: "We're using graphql-ws with an in-memory PubSub which won't scale past a single server. For production we'd need Redis PubSub. Good call to flag this early.", authorName: 'Bob Martinez', questionId: 11 },
];
for (const r of repliesData) {
  emit(`INSERT INTO replies (text, author_name, question_id) VALUES ('${esc(r.text)}', '${esc(r.authorName)}', ${r.questionId});`);
}

// ── Poll 1: Multiple Choice ──
emit(`INSERT INTO polls (id, type, question, is_active, session_id) VALUES (1, 'MULTIPLE_CHOICE', 'Which feature should we build next?', 1, 1);`);

const p1Options = ['Presenter / Display Mode', 'User Authentication (OAuth)', 'Mobile Responsive Redesign', 'Slack / Teams Integration', 'Session Templates & Cloning'];
for (let i = 0; i < p1Options.length; i++) {
  emit(`INSERT INTO poll_options (id, text, position, poll_id) VALUES (${i + 1}, '${esc(p1Options[i])}', ${i}, 1);`);
}

const p1Votes = [5, 3, 4, 2, 3];
let pollRespId = 1;
for (let optIdx = 0; optIdx < p1Options.length; optIdx++) {
  for (let v = 0; v < p1Votes[optIdx]; v++) {
    emit(`INSERT INTO poll_responses (id, voter_token, poll_id, selected_option_id) VALUES (${pollRespId++}, 'poll1-voter-${optIdx}-${v}', 1, ${optIdx + 1});`);
  }
}

// ── Poll 2: Rating ──
emit(`INSERT INTO polls (id, type, question, is_active, session_id) VALUES (2, 'RATING', 'How satisfied are you with the current Q&A experience?', 0, 1);`);

const ratings = [4, 5, 3, 4, 5, 4, 3, 5];
for (let i = 0; i < ratings.length; i++) {
  emit(`INSERT INTO poll_responses (id, voter_token, poll_id, rating_value) VALUES (${pollRespId++}, '${VOTER_TOKENS[i]}', 2, ${ratings[i]});`);
}

// ── Poll 3: Word Cloud ──
emit(`INSERT INTO polls (id, type, question, is_active, session_id) VALUES (3, 'WORD_CLOUD', 'Describe this project in one word', 1, 1);`);

const words = ['ambitious', 'exciting', 'promising', 'ambitious', 'innovative', 'fun', 'complex', 'ambitious', 'cool', 'fast', 'exciting', 'promising', 'elegant', 'exciting', 'bold'];
for (let i = 0; i < words.length; i++) {
  emit(`INSERT INTO poll_responses (id, voter_token, poll_id, text_value) VALUES (${pollRespId++}, 'wc-voter-${i}', 3, '${words[i]}');`);
}

// ── Quiz ──
emit(`INSERT INTO quizzes (id, title, is_active, current_question_index, session_id) VALUES (1, 'Slido Product Knowledge Quiz', 0, -1, 1);`);

const quizQuestionsData = [
  { text: 'How many poll types does the real Slido support?', options: ['3', '5', '7', '10'], correctIndex: 1, timeLimit: 15 },
  { text: 'What technology does our clone use for real-time subscriptions?', options: ['Socket.io', 'Server-Sent Events', 'graphql-ws', 'Long Polling'], correctIndex: 2, timeLimit: 15 },
  { text: 'Which company acquired Slido in 2021?', options: ['Microsoft', 'Cisco', 'Zoom', 'Google'], correctIndex: 1, timeLimit: 20 },
  { text: 'What ORM does our backend use?', options: ['Prisma', 'Drizzle', 'TypeORM', 'Sequelize'], correctIndex: 2, timeLimit: 10 },
];

let quizQuestionId = 1;
let quizOptionId = 1;
let quizAnswerId = 1;
const deterministicMs = [4200, 5800, 3500, 7100, 6300, 9200];

for (let qi = 0; qi < quizQuestionsData.length; qi++) {
  const qd = quizQuestionsData[qi];
  const qqId = quizQuestionId++;
  emit(`INSERT INTO quiz_questions (id, text, time_limit, position, quiz_id) VALUES (${qqId}, '${esc(qd.text)}', ${qd.timeLimit}, ${qi}, 1);`);

  const optionIds: number[] = [];
  for (let oi = 0; oi < qd.options.length; oi++) {
    const oId = quizOptionId++;
    optionIds.push(oId);
    emit(`INSERT INTO quiz_options (id, text, position, quiz_question_id) VALUES (${oId}, '${esc(qd.options[oi])}', ${oi}, ${qqId});`);
  }

  emit(`UPDATE quiz_questions SET correct_option_id = ${optionIds[qd.correctIndex]} WHERE id = ${qqId};`);

  for (let vi = 0; vi < 6; vi++) {
    const pickedIdx = vi < 4 ? qd.correctIndex : (qd.correctIndex + 1) % 4;
    const ms = deterministicMs[vi];
    const isCorrect = pickedIdx === qd.correctIndex ? 1 : 0;
    const score = isCorrect ? Math.max(100, Math.round(1000 - (ms / (qd.timeLimit * 1000)) * 900)) : 0;
    emit(`INSERT INTO quiz_answers (id, voter_token, quiz_question_id, selected_option_id, answered_in_ms, is_correct, score) VALUES (${quizAnswerId++}, '${VOTER_TOKENS[vi]}', ${qqId}, ${optionIds[pickedIdx]}, ${ms}, ${isCorrect}, ${score});`);
  }
}

// ── Survey ──
emit(`INSERT INTO surveys (id, title, is_open, session_id) VALUES (1, 'Sprint Retrospective: Feature Development', 1, 1);`);

emit(`INSERT INTO survey_questions (id, type, text, position, is_required, survey_id) VALUES (1, 'RATING', 'How would you rate the overall development velocity this sprint?', 0, 1, 1);`);
emit(`INSERT INTO survey_questions (id, type, text, position, is_required, survey_id) VALUES (2, 'MULTIPLE_CHOICE', 'What was the biggest blocker this sprint?', 1, 1, 1);`);
emit(`INSERT INTO survey_questions (id, type, text, position, is_required, survey_id) VALUES (3, 'OPEN_TEXT', 'What should we start, stop, or continue doing?', 2, 0, 1);`);

const sq2Options = ['Unclear requirements', 'Technical debt', 'Dependency on other teams', 'No major blockers'];
for (let i = 0; i < sq2Options.length; i++) {
  emit(`INSERT INTO survey_options (id, text, position, survey_question_id) VALUES (${i + 1}, '${esc(sq2Options[i])}', ${i}, 2);`);
}

const surveyFeedback = [
  { rating: 4, blockerIdx: 1, text: 'Start: automated testing. Stop: skipping code reviews. Continue: daily standups.' },
  { rating: 3, blockerIdx: 0, text: 'We need better specs before jumping into implementation. The poll feature had 3 rewrites.' },
  { rating: 5, blockerIdx: 3, text: "Great sprint! The quiz feature turned out really well. Let's keep this momentum." },
  { rating: 4, blockerIdx: 2, text: 'Start: design reviews. The word cloud visualization needs UX input before we build it.' },
  { rating: 3, blockerIdx: 1, text: 'Continue: pair programming. Stop: deploying on Fridays.' },
];

let surveyAnswerId = 1;
for (let ri = 0; ri < surveyFeedback.length; ri++) {
  const fb = surveyFeedback[ri];
  const srId = ri + 1;
  emit(`INSERT INTO survey_responses (id, voter_token, survey_id) VALUES (${srId}, '${VOTER_TOKENS[ri]}', 1);`);
  emit(`INSERT INTO survey_answers (id, survey_response_id, survey_question_id, rating_value) VALUES (${surveyAnswerId++}, ${srId}, 1, ${fb.rating});`);
  emit(`INSERT INTO survey_answers (id, survey_response_id, survey_question_id, selected_option_id) VALUES (${surveyAnswerId++}, ${srId}, 2, ${fb.blockerIdx + 1});`);
  emit(`INSERT INTO survey_answers (id, survey_response_id, survey_question_id, text_value) VALUES (${surveyAnswerId++}, ${srId}, 3, '${esc(fb.text)}');`);
}

// ── Write SQL file and execute ──
const sqlFile = join(process.cwd(), 'seed-remote.sql');
writeFileSync(sqlFile, lines.join('\n'), 'utf-8');
console.log(`Generated ${lines.length} SQL statements → ${sqlFile}`);

try {
  console.log('Executing against remote D1...');
  execSync(`npx wrangler d1 execute slido-db --remote --file=${sqlFile}`, { stdio: 'inherit' });
  console.log('\nSeed complete!');
  console.log('  Session: SLIDODEV');
  console.log('  Host login: host@slido.dev / password123');
  console.log('  Questions: 12');
  console.log('  Polls: 3 (MC, Rating, Word Cloud)');
  console.log('  Quiz: 1 (4 questions)');
  console.log('  Survey: 1 (5 responses)');
} finally {
  unlinkSync(sqlFile);
}
