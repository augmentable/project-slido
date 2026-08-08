import 'reflect-metadata';
import 'dotenv/config';
import crypto from 'node:crypto';
import { AppDataSource } from './data-source';
import { User } from './entities/User';
import { Session } from './entities/Session';
import { Question } from './entities/Question';
import { Upvote } from './entities/Upvote';
import { Reply } from './entities/Reply';
import { Poll, PollType } from './entities/Poll';
import { PollOption } from './entities/PollOption';
import { PollResponse } from './entities/PollResponse';
import { Quiz } from './entities/Quiz';
import { QuizQuestion } from './entities/QuizQuestion';
import { QuizOption } from './entities/QuizOption';
import { QuizAnswer } from './entities/QuizAnswer';
import { Survey } from './entities/Survey';
import { SurveyQuestion, SurveyQuestionType } from './entities/SurveyQuestion';
import { SurveyOption } from './entities/SurveyOption';
import { SurveyResponse } from './entities/SurveyResponse';
import { SurveyAnswer } from './entities/SurveyAnswer';

function hash(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

const VOTER_TOKENS = [
  'voter-alice-uuid', 'voter-bob-uuid', 'voter-carol-uuid',
  'voter-dave-uuid', 'voter-eve-uuid', 'voter-frank-uuid',
  'voter-grace-uuid', 'voter-heidi-uuid',
];

async function seed() {
  await AppDataSource.initialize();
  console.log('Connected. Seeding...');

  // Clear existing data
  await AppDataSource.query('TRUNCATE TABLE survey_answer, survey_response, survey_option, survey_question, survey, quiz_answer, quiz_option, quiz_question, quiz, poll_response, poll_option, poll, reply, upvote, question, session, "user" CASCADE');

  const userRepo = AppDataSource.getRepository(User);
  const sessionRepo = AppDataSource.getRepository(Session);
  const questionRepo = AppDataSource.getRepository(Question);
  const upvoteRepo = AppDataSource.getRepository(Upvote);
  const replyRepo = AppDataSource.getRepository(Reply);
  const pollRepo = AppDataSource.getRepository(Poll);
  const pollOptionRepo = AppDataSource.getRepository(PollOption);
  const pollResponseRepo = AppDataSource.getRepository(PollResponse);
  const quizRepo = AppDataSource.getRepository(Quiz);
  const quizQuestionRepo = AppDataSource.getRepository(QuizQuestion);
  const quizOptionRepo = AppDataSource.getRepository(QuizOption);
  const quizAnswerRepo = AppDataSource.getRepository(QuizAnswer);
  const surveyRepo = AppDataSource.getRepository(Survey);
  const surveyQuestionRepo = AppDataSource.getRepository(SurveyQuestion);
  const surveyOptionRepo = AppDataSource.getRepository(SurveyOption);
  const surveyResponseRepo = AppDataSource.getRepository(SurveyResponse);
  const surveyAnswerRepo = AppDataSource.getRepository(SurveyAnswer);

  // --- Users ---
  const host = await userRepo.save(userRepo.create({
    email: 'host@slido.dev',
    passwordHash: hash('password123'),
    displayName: 'Sarah Chen',
  }));
  await userRepo.save(userRepo.create({
    email: 'alice@team.dev',
    passwordHash: hash('password123'),
    displayName: 'Alice Park',
  }));

  // --- Session ---
  const session = await sessionRepo.save(sessionRepo.create({
    title: 'Slido Clone: Feature Prioritization',
    code: 'SLIDODEV',
    isModerated: false,
    owner: host,
  }));

  // --- Q&A Questions ---
  const questionsData = [
    { text: 'Should we prioritize real-time collaboration features like Google Docs-style co-editing of polls, or keep the current single-author model?', authorName: 'Alice Park', upvotes: 12, highlighted: true },
    { text: 'How are we planning to handle user authentication? JWT tokens seem fine for an MVP, but should we consider OAuth2 with Google/GitHub for a smoother sign-up experience?', authorName: 'Bob Martinez', upvotes: 18, answered: true },
    { text: 'The word cloud feature looks cool but feels like a nice-to-have. Can we defer it and focus on getting the presenter mode right first?', authorName: 'Carol Davis', upvotes: 9 },
    { text: 'What about mobile responsiveness? I tried the app on my phone and the quiz timer buttons are tiny. Should we adopt a mobile-first approach?', authorName: 'Dave Wilson', upvotes: 15 },
    { text: 'Can we add a "duplicate session" feature? As a host I want to reuse my poll/quiz templates across different meetings without recreating everything.', authorName: 'Eve Thompson', upvotes: 22 },
    { text: 'The analytics dashboard is great but lacks export to PDF. CSV is fine for data nerds but most managers want a nice visual report. Worth adding?', authorName: 'Frank Lee', upvotes: 7 },
    { text: 'Has anyone thought about accessibility? Screen readers can\'t navigate the quiz countdown timer properly. We should add ARIA labels.', authorName: 'Grace Kim', upvotes: 14 },
    { text: 'Integration with Slack would be massive. Imagine getting a notification when someone asks a question in your session. Is this feasible with webhooks?', authorName: null, upvotes: 11 },
    { text: 'For the ranking poll type, can we add drag-and-drop reordering? The current click-to-rank feels clunky compared to what Mentimeter offers.', authorName: 'Alice Park', upvotes: 6 },
    { text: 'Should we consider adding a "hand raise" feature alongside Q&A? In hybrid meetings, remote participants often get overlooked.', authorName: 'Heidi Nakamura', upvotes: 8 },
    { text: 'What\'s our strategy for handling concurrent sessions? If 500 people join at once, will the WebSocket server hold up?', authorName: 'Bob Martinez', upvotes: 19 },
    { text: 'Can we add emoji reactions to questions instead of just upvotes? Something like 👍 ❤️ 😂 🤔 would give richer signal about audience sentiment.', authorName: 'Carol Davis', upvotes: 5 },
  ];

  const savedQuestions: Question[] = [];
  for (const qd of questionsData) {
    const q = await questionRepo.save(questionRepo.create({
      text: qd.text,
      authorName: qd.authorName,
      isApproved: true,
      isHighlighted: qd.highlighted ?? false,
      isAnswered: qd.answered ?? false,
      session,
    }));
    savedQuestions.push(q);

    const voterCount = Math.min(qd.upvotes, VOTER_TOKENS.length);
    for (let i = 0; i < voterCount; i++) {
      await upvoteRepo.save(upvoteRepo.create({
        voterToken: VOTER_TOKENS[i],
        question: q,
      }));
    }
  }

  // --- Replies ---
  await replyRepo.save(replyRepo.create({
    text: 'Great question! We decided on JWT for the MVP, with OAuth2 (Google + GitHub) planned for v2. The auth system is now live with email/password.',
    authorName: 'Sarah Chen',
    question: savedQuestions[1],
  }));
  await replyRepo.save(replyRepo.create({
    text: 'Agreed on mobile — I\'ve filed this as a high priority. We\'ll do a responsive pass before the next demo.',
    authorName: 'Sarah Chen',
    question: savedQuestions[3],
  }));
  await replyRepo.save(replyRepo.create({
    text: 'Session templates are a great idea. Adding to the Phase 2 backlog. For now you can manually recreate, but a "clone session" button is coming.',
    authorName: 'Sarah Chen',
    question: savedQuestions[4],
  }));
  await replyRepo.save(replyRepo.create({
    text: 'We\'re using graphql-ws with an in-memory PubSub which won\'t scale past a single server. For production we\'d need Redis PubSub. Good call to flag this early.',
    authorName: 'Bob Martinez',
    question: savedQuestions[10],
  }));

  // --- Poll 1: Multiple Choice ---
  const poll1 = await pollRepo.save(pollRepo.create({
    type: PollType.MULTIPLE_CHOICE,
    question: 'Which feature should we build next?',
    isActive: true,
    session,
  }));
  const p1Options = await pollOptionRepo.save([
    pollOptionRepo.create({ text: 'Presenter / Display Mode', position: 0, poll: poll1 }),
    pollOptionRepo.create({ text: 'User Authentication (OAuth)', position: 1, poll: poll1 }),
    pollOptionRepo.create({ text: 'Mobile Responsive Redesign', position: 2, poll: poll1 }),
    pollOptionRepo.create({ text: 'Slack / Teams Integration', position: 3, poll: poll1 }),
    pollOptionRepo.create({ text: 'Session Templates & Cloning', position: 4, poll: poll1 }),
  ]);
  const p1Votes = [5, 3, 4, 2, 3];
  for (let optIdx = 0; optIdx < p1Options.length; optIdx++) {
    for (let v = 0; v < p1Votes[optIdx]; v++) {
      await pollResponseRepo.save(pollResponseRepo.create({
        poll: poll1,
        voterToken: `poll1-voter-${optIdx}-${v}`,
        selectedOption: p1Options[optIdx],
      }));
    }
  }

  // --- Poll 2: Rating ---
  const poll2 = await pollRepo.save(pollRepo.create({
    type: PollType.RATING,
    question: 'How satisfied are you with the current Q&A experience?',
    isActive: false,
    session,
  }));
  for (let i = 0; i < 8; i++) {
    await pollResponseRepo.save(pollResponseRepo.create({
      poll: poll2,
      voterToken: VOTER_TOKENS[i],
      ratingValue: [4, 5, 3, 4, 5, 4, 3, 5][i],
    }));
  }

  // --- Poll 3: Word Cloud ---
  const poll3 = await pollRepo.save(pollRepo.create({
    type: PollType.WORD_CLOUD,
    question: 'Describe this project in one word',
    isActive: true,
    session,
  }));
  const words = ['ambitious', 'exciting', 'promising', 'ambitious', 'innovative', 'fun', 'complex', 'ambitious', 'cool', 'fast', 'exciting', 'promising', 'elegant', 'exciting', 'bold'];
  for (let i = 0; i < words.length; i++) {
    await pollResponseRepo.save(pollResponseRepo.create({
      poll: poll3,
      voterToken: `wc-voter-${i}`,
      textValue: words[i],
    }));
  }

  // --- Quiz ---
  const quiz = await quizRepo.save(quizRepo.create({
    title: 'Slido Product Knowledge Quiz',
    isActive: false,
    currentQuestionIndex: -1,
    session,
  }));

  const quizQuestionsData = [
    {
      text: 'How many poll types does the real Slido support?',
      options: ['3', '5', '7', '10'],
      correctIndex: 1,
      timeLimit: 15,
    },
    {
      text: 'What technology does our clone use for real-time subscriptions?',
      options: ['Socket.io', 'Server-Sent Events', 'graphql-ws', 'Long Polling'],
      correctIndex: 2,
      timeLimit: 15,
    },
    {
      text: 'Which company acquired Slido in 2021?',
      options: ['Microsoft', 'Cisco', 'Zoom', 'Google'],
      correctIndex: 1,
      timeLimit: 20,
    },
    {
      text: 'What ORM does our backend use?',
      options: ['Prisma', 'Drizzle', 'TypeORM', 'Sequelize'],
      correctIndex: 2,
      timeLimit: 10,
    },
  ];

  for (let qi = 0; qi < quizQuestionsData.length; qi++) {
    const qd = quizQuestionsData[qi];
    const qq = await quizQuestionRepo.save(quizQuestionRepo.create({
      text: qd.text,
      timeLimit: qd.timeLimit,
      position: qi,
      quiz,
    }));

    const options = await quizOptionRepo.save(
      qd.options.map((text, i) => quizOptionRepo.create({ text, position: i, quizQuestion: qq })),
    );
    qq.correctOptionId = Number(options[qd.correctIndex].id);
    await quizQuestionRepo.save(qq);

    // Simulate some answers
    for (let vi = 0; vi < 6; vi++) {
      const pickedIdx = vi < 4 ? qd.correctIndex : (qd.correctIndex + 1) % 4;
      const ms = 3000 + Math.floor(Math.random() * 8000);
      const isCorrect = pickedIdx === qd.correctIndex;
      await quizAnswerRepo.save(quizAnswerRepo.create({
        quizQuestion: qq,
        selectedOption: options[pickedIdx],
        voterToken: VOTER_TOKENS[vi],
        answeredInMs: ms,
        isCorrect,
        score: isCorrect ? Math.max(100, Math.round(1000 - (ms / (qd.timeLimit * 1000)) * 900)) : 0,
      }));
    }
  }

  // --- Survey ---
  const survey = await surveyRepo.save(surveyRepo.create({
    title: 'Sprint Retrospective: Feature Development',
    isOpen: true,
    session,
  }));

  const sq1 = await surveyQuestionRepo.save(surveyQuestionRepo.create({
    type: SurveyQuestionType.RATING,
    text: 'How would you rate the overall development velocity this sprint?',
    position: 0,
    isRequired: true,
    survey,
  }));
  sq1.options = [];

  const sq2 = await surveyQuestionRepo.save(surveyQuestionRepo.create({
    type: SurveyQuestionType.MULTIPLE_CHOICE,
    text: 'What was the biggest blocker this sprint?',
    position: 1,
    isRequired: true,
    survey,
  }));
  const sq2Options = await surveyOptionRepo.save([
    surveyOptionRepo.create({ text: 'Unclear requirements', position: 0, surveyQuestion: sq2 }),
    surveyOptionRepo.create({ text: 'Technical debt', position: 1, surveyQuestion: sq2 }),
    surveyOptionRepo.create({ text: 'Dependency on other teams', position: 2, surveyQuestion: sq2 }),
    surveyOptionRepo.create({ text: 'No major blockers', position: 3, surveyQuestion: sq2 }),
  ]);

  const sq3 = await surveyQuestionRepo.save(surveyQuestionRepo.create({
    type: SurveyQuestionType.OPEN_TEXT,
    text: 'What should we start, stop, or continue doing?',
    position: 2,
    isRequired: false,
    survey,
  }));
  sq3.options = [];

  // Simulate survey responses
  const surveyFeedback = [
    { rating: 4, blockerIdx: 1, text: 'Start: automated testing. Stop: skipping code reviews. Continue: daily standups.' },
    { rating: 3, blockerIdx: 0, text: 'We need better specs before jumping into implementation. The poll feature had 3 rewrites.' },
    { rating: 5, blockerIdx: 3, text: 'Great sprint! The quiz feature turned out really well. Let\'s keep this momentum.' },
    { rating: 4, blockerIdx: 2, text: 'Start: design reviews. The word cloud visualization needs UX input before we build it.' },
    { rating: 3, blockerIdx: 1, text: 'Continue: pair programming. Stop: deploying on Fridays.' },
  ];

  for (let ri = 0; ri < surveyFeedback.length; ri++) {
    const fb = surveyFeedback[ri];
    const sr = await surveyResponseRepo.save(surveyResponseRepo.create({
      survey,
      voterToken: VOTER_TOKENS[ri],
    }));

    await surveyAnswerRepo.save([
      surveyAnswerRepo.create({ surveyResponse: sr, surveyQuestion: sq1, ratingValue: fb.rating }),
      surveyAnswerRepo.create({ surveyResponse: sr, surveyQuestion: sq2, selectedOption: sq2Options[fb.blockerIdx] }),
      surveyAnswerRepo.create({ surveyResponse: sr, surveyQuestion: sq3, textValue: fb.text }),
    ]);
  }

  console.log('Seed complete!');
  console.log(`  Session: ${session.code} (id: ${session.id})`);
  console.log(`  Host login: host@slido.dev / password123`);
  console.log(`  Questions: ${savedQuestions.length}`);
  console.log(`  Polls: 3 (MC, Rating, Word Cloud)`);
  console.log(`  Quiz: 1 (${quizQuestionsData.length} questions)`);
  console.log(`  Survey: 1 (${surveyFeedback.length} responses)`);

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
