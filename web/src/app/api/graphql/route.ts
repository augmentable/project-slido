import { createSchema, createYoga } from 'graphql-yoga';
import { getDb, type Db } from '@/db';
import * as s from '@/db/schema';
import { eq, and, count, avg, sum, sql, desc, asc } from 'drizzle-orm';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'slido-clone-dev-secret';
const MAX_TITLE_LENGTH = 200;
const MAX_CODE_LENGTH = 32;
const MAX_QUESTION_LENGTH = 2000;
const MAX_NAME_LENGTH = 100;
const CODE_PATTERN = /^[A-Z0-9_-]+$/;

function hashPassword(pw: string) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

// ── Schema ──

const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type User {
      id: ID!
      email: String!
      displayName: String!
      createdAt: String!
    }

    type AuthPayload {
      token: String!
      user: User!
    }

    type Session {
      id: ID!
      code: String!
      title: String!
      isModerated: Boolean!
      isPasswordProtected: Boolean!
      primaryColor: String
      logoUrl: String
      owner: User
      questions: [Question!]!
      polls: [Poll!]!
      quizzes: [Quiz!]!
      surveys: [Survey!]!
      createdAt: String!
    }

    type Question {
      id: ID!
      text: String!
      authorName: String
      isApproved: Boolean!
      isHighlighted: Boolean!
      isAnswered: Boolean!
      upvoteCount: Int!
      replies: [Reply!]!
      createdAt: String!
    }

    type Reply {
      id: ID!
      text: String!
      authorName: String!
      createdAt: String!
    }

    type Poll {
      id: ID!
      type: String!
      question: String!
      isActive: Boolean!
      allowMultiple: Boolean!
      responseCount: Int!
      options: [PollOption!]!
      responses: [PollResponse!]!
      createdAt: String!
    }

    type PollOption {
      id: ID!
      text: String!
      position: Int!
      voteCount: Int!
    }

    type PollResponse {
      id: ID!
      voterToken: String!
      selectedOption: PollOption
      textValue: String
      ratingValue: Int
      rankingOrder: [String!]
    }

    type Quiz {
      id: ID!
      title: String!
      isActive: Boolean!
      currentQuestionIndex: Int!
      questions: [QuizQuestion!]!
      createdAt: String!
    }

    type QuizQuestion {
      id: ID!
      text: String!
      timeLimit: Int!
      position: Int!
      correctOptionId: Int
      options: [QuizOption!]!
    }

    type QuizOption {
      id: ID!
      text: String!
      position: Int!
    }

    type QuizAnswer {
      id: ID!
      voterToken: String!
      selectedOption: QuizOption
      answeredInMs: Int!
      isCorrect: Boolean!
      score: Int!
    }

    type LeaderboardEntry {
      voterToken: String!
      totalScore: Int!
      correctCount: Int!
    }

    type Survey {
      id: ID!
      title: String!
      isOpen: Boolean!
      responseCount: Int!
      questions: [SurveyQuestion!]!
      createdAt: String!
    }

    type SurveyQuestion {
      id: ID!
      type: String!
      text: String!
      position: Int!
      isRequired: Boolean!
      options: [SurveyOption!]!
    }

    type SurveyOption {
      id: ID!
      text: String!
      position: Int!
    }

    type SurveyResponse {
      id: ID!
      voterToken: String!
      answers: [SurveyAnswer!]!
      submittedAt: String!
    }

    type SurveyAnswer {
      id: ID!
      surveyQuestion: SurveyQuestion!
      selectedOption: SurveyOption
      textValue: String
      ratingValue: Int
    }

    type SessionAnalytics {
      totalParticipants: Int!
      totalQuestions: Int!
      totalUpvotes: Int!
      totalPolls: Int!
      totalPollResponses: Int!
      totalQuizzes: Int!
      quizAverageScore: Float!
      totalSurveys: Int!
      totalSurveyResponses: Int!
    }

    input SurveyAnswerInput {
      surveyQuestionId: String!
      selectedOptionId: String
      textValue: String
      ratingValue: Int
    }

    type SessionCheck {
      exists: Boolean!
      isPasswordProtected: Boolean!
    }

    type Query {
      me(token: String!): User
      checkSession(code: String!): SessionCheck!
      session(code: String!, passcode: String): Session
      pendingQuestions(sessionId: String!): [Question!]!
      poll(pollId: String!): Poll
      quiz(quizId: String!): Quiz
      quizLeaderboard(quizId: String!): [LeaderboardEntry!]!
      survey(surveyId: String!): Survey
      sessionAnalytics(sessionId: String!): SessionAnalytics!
    }

    type Mutation {
      register(email: String!, password: String!, displayName: String!): AuthPayload!
      login(email: String!, password: String!): AuthPayload!
      createSession(title: String!, code: String!, isModerated: Boolean, passcode: String, authToken: String): Session!
      updateSessionBranding(sessionId: String!, primaryColor: String, logoUrl: String): Session!
      createQuestion(sessionId: String!, text: String!, authorName: String): Question!
      approveQuestion(questionId: String!): Question!
      rejectQuestion(questionId: String!): Boolean!
      highlightQuestion(questionId: String!, highlighted: Boolean!): Question!
      markAsAnswered(questionId: String!, answered: Boolean!): Question!
      replyToQuestion(questionId: String!, text: String!, authorName: String!): Reply!
      upvoteQuestion(questionId: String!, voterToken: String!): Question!
      createPoll(sessionId: String!, type: String!, question: String!, options: [String!], allowMultiple: Boolean): Poll!
      activatePoll(pollId: String!): Poll!
      deactivatePoll(pollId: String!): Poll!
      submitPollResponse(pollId: String!, voterToken: String!, selectedOptionId: String, textValue: String, ratingValue: Float, rankingOrder: [String!]): Boolean!
      createQuiz(sessionId: String!, title: String!): Quiz!
      addQuizQuestion(quizId: String!, text: String!, options: [String!]!, correctOptionIndex: Int!, timeLimit: Int): QuizQuestion!
      startQuiz(quizId: String!): Quiz!
      nextQuizQuestion(quizId: String!): Quiz!
      submitQuizAnswer(quizQuestionId: String!, selectedOptionId: String!, voterToken: String!, answeredInMs: Int!): QuizAnswer!
      createSurvey(sessionId: String!, title: String!): Survey!
      addSurveyQuestion(surveyId: String!, type: String!, text: String!, options: [String!], isRequired: Boolean): SurveyQuestion!
      submitSurveyResponse(surveyId: String!, voterToken: String!, answers: [SurveyAnswerInput!]!): SurveyResponse!
      closeSurvey(surveyId: String!): Survey!
    }
  `,
  resolvers: {
    Query: {
      // ── Auth ──
      me: async (_: unknown, { token }: { token: string }, { db }: Ctx) => {
        try {
          const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
          const [user] = await db.select().from(s.users).where(eq(s.users.id, payload.userId));
          return user || null;
        } catch {
          return null;
        }
      },

      // ── Session ──
      checkSession: async (_: unknown, { code }: { code: string }, { db }: Ctx) => {
        const sanitized = code.trim().toUpperCase().slice(0, MAX_CODE_LENGTH);
        if (!CODE_PATTERN.test(sanitized)) return { exists: false, isPasswordProtected: false };
        const row = await db.query.sessions.findFirst({
          where: eq(s.sessions.code, sanitized),
          columns: { id: true, passcodeHash: true },
        });
        if (!row) return { exists: false, isPasswordProtected: false };
        return { exists: true, isPasswordProtected: !!row.passcodeHash };
      },

      session: async (_: unknown, { code, passcode }: { code: string; passcode?: string }, { db }: Ctx) => {
        const sanitized = code.trim().toUpperCase().slice(0, MAX_CODE_LENGTH);
        if (!CODE_PATTERN.test(sanitized)) return null;

        const result = await db.query.sessions.findFirst({
          where: eq(s.sessions.code, sanitized),
          with: {
            owner: true,
            questions: { with: { replies: true, upvotes: true }, orderBy: [desc(s.questions.createdAt)] },
            polls: { with: { options: true, responses: { with: { selectedOption: true } } } },
            quizzes: { with: { questions: { with: { options: true }, orderBy: [asc(s.quizQuestions.position)] } } },
            surveys: { with: { questions: { with: { options: true }, orderBy: [asc(s.surveyQuestions.position)] } } },
          },
        });

        if (!result) return null;

        if (result.passcodeHash) {
          if (!passcode || hashPassword(passcode) !== result.passcodeHash) return null;
        }

        let questionsList = result.questions || [];
        if (result.isModerated) {
          questionsList = questionsList.filter((q) => q.isApproved);
        }

        const questionsWithCounts = questionsList.map((q) => ({
          ...q,
          _upvoteCount: q.upvotes?.length ?? 0,
        }));

        const pollsWithCounts = (result.polls || []).map((p) => ({
          ...p,
          _responseCount: p.responses?.length ?? 0,
          options: (p.options || []).map((o) => ({
            ...o,
            _voteCount: p.responses?.filter((r) => r.selectedOptionId === o.id).length ?? 0,
          })),
        }));

        return { ...result, isPasswordProtected: !!result.passcodeHash, questions: questionsWithCounts, polls: pollsWithCounts };
      },

      pendingQuestions: async (_: unknown, { sessionId }: { sessionId: string }, { db }: Ctx) => {
        const rows = await db.select().from(s.questions)
          .where(and(eq(s.questions.sessionId, Number(sessionId)), eq(s.questions.isApproved, false)))
          .orderBy(desc(s.questions.createdAt));
        return rows;
      },

      // ── Poll ──
      poll: async (_: unknown, { pollId }: { pollId: string }, { db }: Ctx) => {
        return db.query.polls.findFirst({
          where: eq(s.polls.id, Number(pollId)),
          with: { options: true, responses: { with: { selectedOption: true } } },
        });
      },

      // ── Quiz ──
      quiz: async (_: unknown, { quizId }: { quizId: string }, { db }: Ctx) => {
        return db.query.quizzes.findFirst({
          where: eq(s.quizzes.id, Number(quizId)),
          with: { questions: { with: { options: true }, orderBy: [asc(s.quizQuestions.position)] } },
        });
      },

      quizLeaderboard: async (_: unknown, { quizId }: { quizId: string }, { db }: Ctx) => {
        const rows = await db.select({
          voterToken: s.quizAnswers.voterToken,
          totalScore: sum(s.quizAnswers.score).as('totalScore'),
          correctCount: sum(sql`CASE WHEN ${s.quizAnswers.isCorrect} THEN 1 ELSE 0 END`).as('correctCount'),
        })
          .from(s.quizAnswers)
          .innerJoin(s.quizQuestions, eq(s.quizAnswers.quizQuestionId, s.quizQuestions.id))
          .where(eq(s.quizQuestions.quizId, Number(quizId)))
          .groupBy(s.quizAnswers.voterToken)
          .orderBy(desc(sql`totalScore`));

        return rows.map((r) => ({
          voterToken: r.voterToken,
          totalScore: Number(r.totalScore) || 0,
          correctCount: Number(r.correctCount) || 0,
        }));
      },

      // ── Survey ──
      survey: async (_: unknown, { surveyId }: { surveyId: string }, { db }: Ctx) => {
        return db.query.surveys.findFirst({
          where: eq(s.surveys.id, Number(surveyId)),
          with: { questions: { with: { options: true }, orderBy: [asc(s.surveyQuestions.position)] } },
        });
      },

      // ── Analytics ──
      sessionAnalytics: async (_: unknown, { sessionId }: { sessionId: string }, { db }: Ctx) => {
        const sid = Number(sessionId);

        const [qCount] = await db.select({ c: count() }).from(s.questions).where(eq(s.questions.sessionId, sid));
        const [uCount] = await db.select({ c: count() }).from(s.upvotes)
          .innerJoin(s.questions, eq(s.upvotes.questionId, s.questions.id))
          .where(eq(s.questions.sessionId, sid));
        const [pCount] = await db.select({ c: count() }).from(s.polls).where(eq(s.polls.sessionId, sid));
        const [prCount] = await db.select({ c: count() }).from(s.pollResponses)
          .innerJoin(s.polls, eq(s.pollResponses.pollId, s.polls.id))
          .where(eq(s.polls.sessionId, sid));
        const [qzCount] = await db.select({ c: count() }).from(s.quizzes).where(eq(s.quizzes.sessionId, sid));
        const [avgScore] = await db.select({ a: avg(s.quizAnswers.score) }).from(s.quizAnswers)
          .innerJoin(s.quizQuestions, eq(s.quizAnswers.quizQuestionId, s.quizQuestions.id))
          .innerJoin(s.quizzes, eq(s.quizQuestions.quizId, s.quizzes.id))
          .where(eq(s.quizzes.sessionId, sid));
        const [svCount] = await db.select({ c: count() }).from(s.surveys).where(eq(s.surveys.sessionId, sid));
        const [srCount] = await db.select({ c: count() }).from(s.surveyResponses)
          .innerJoin(s.surveys, eq(s.surveyResponses.surveyId, s.surveys.id))
          .where(eq(s.surveys.sessionId, sid));

        const voterTokens = new Set<string>();
        const upTokens = await db.selectDistinct({ t: s.upvotes.voterToken }).from(s.upvotes)
          .innerJoin(s.questions, eq(s.upvotes.questionId, s.questions.id))
          .where(eq(s.questions.sessionId, sid));
        upTokens.forEach((r) => voterTokens.add(r.t));
        const pollTokens = await db.selectDistinct({ t: s.pollResponses.voterToken }).from(s.pollResponses)
          .innerJoin(s.polls, eq(s.pollResponses.pollId, s.polls.id))
          .where(eq(s.polls.sessionId, sid));
        pollTokens.forEach((r) => voterTokens.add(r.t));
        const quizTokens = await db.selectDistinct({ t: s.quizAnswers.voterToken }).from(s.quizAnswers)
          .innerJoin(s.quizQuestions, eq(s.quizAnswers.quizQuestionId, s.quizQuestions.id))
          .innerJoin(s.quizzes, eq(s.quizQuestions.quizId, s.quizzes.id))
          .where(eq(s.quizzes.sessionId, sid));
        quizTokens.forEach((r) => voterTokens.add(r.t));
        const surveyTokens = await db.selectDistinct({ t: s.surveyResponses.voterToken }).from(s.surveyResponses)
          .innerJoin(s.surveys, eq(s.surveyResponses.surveyId, s.surveys.id))
          .where(eq(s.surveys.sessionId, sid));
        surveyTokens.forEach((r) => voterTokens.add(r.t));

        return {
          totalParticipants: voterTokens.size,
          totalQuestions: qCount.c,
          totalUpvotes: uCount.c,
          totalPolls: pCount.c,
          totalPollResponses: prCount.c,
          totalQuizzes: qzCount.c,
          quizAverageScore: Number(avgScore.a) || 0,
          totalSurveys: svCount.c,
          totalSurveyResponses: srCount.c,
        };
      },
    },

    Mutation: {
      // ── Auth ──
      register: async (_: unknown, { email, password, displayName }: { email: string; password: string; displayName: string }, { db }: Ctx) => {
        const trimmedEmail = email.trim().toLowerCase().slice(0, 255);
        const trimmedName = displayName.trim().slice(0, 100);
        if (!trimmedEmail || !password || !trimmedName) throw new Error('All fields are required');

        const existing = await db.select().from(s.users).where(eq(s.users.email, trimmedEmail));
        if (existing.length) throw new Error('Email already registered');

        const [user] = await db.insert(s.users).values({
          email: trimmedEmail,
          passwordHash: hashPassword(password),
          displayName: trimmedName,
        }).returning();

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        return { token, user };
      },

      login: async (_: unknown, { email, password }: { email: string; password: string }, { db }: Ctx) => {
        const [user] = await db.select().from(s.users).where(eq(s.users.email, email.trim().toLowerCase()));
        if (!user || user.passwordHash !== hashPassword(password)) throw new Error('Invalid email or password');

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        return { token, user };
      },

      // ── Session ──
      createSession: async (_: unknown, args: { title: string; code: string; isModerated?: boolean; passcode?: string; authToken?: string }, { db }: Ctx) => {
        const trimmedTitle = args.title.trim().slice(0, MAX_TITLE_LENGTH);
        const trimmedCode = args.code.trim().toUpperCase().slice(0, MAX_CODE_LENGTH);
        if (!trimmedTitle) throw new Error('Title is required');
        if (!trimmedCode) throw new Error('Code is required');
        if (!CODE_PATTERN.test(trimmedCode)) throw new Error('Code may only contain letters, numbers, hyphens, and underscores');

        const existing = await db.select().from(s.sessions).where(eq(s.sessions.code, trimmedCode));
        if (existing.length) throw new Error('A session with that code already exists');

        let ownerId: number | null = null;
        if (args.authToken) {
          try {
            const payload = jwt.verify(args.authToken, JWT_SECRET) as { userId: number };
            ownerId = payload.userId;
          } catch { /* no owner */ }
        }

        const [session] = await db.insert(s.sessions).values({
          title: trimmedTitle,
          code: trimmedCode,
          isModerated: args.isModerated ?? false,
          passcodeHash: args.passcode ? hashPassword(args.passcode) : null,
          ownerId,
        }).returning();

        return { ...session, isPasswordProtected: !!session.passcodeHash, questions: [], polls: [], quizzes: [], surveys: [], owner: null };
      },

      updateSessionBranding: async (_: unknown, args: { sessionId: string; primaryColor?: string; logoUrl?: string }, { db }: Ctx) => {
        const [session] = await db.select().from(s.sessions).where(eq(s.sessions.id, Number(args.sessionId)));
        if (!session) throw new Error('Session not found');

        const updates: Record<string, unknown> = {};
        if (args.primaryColor !== undefined) updates.primaryColor = args.primaryColor;
        if (args.logoUrl !== undefined) updates.logoUrl = args.logoUrl;

        const [updated] = await db.update(s.sessions).set(updates).where(eq(s.sessions.id, session.id)).returning();
        return { ...updated, isPasswordProtected: !!updated.passcodeHash };
      },

      // ── Questions ──
      createQuestion: async (_: unknown, args: { sessionId: string; text: string; authorName?: string }, { db }: Ctx) => {
        const trimmedText = args.text.trim().slice(0, MAX_QUESTION_LENGTH);
        if (!trimmedText) throw new Error('Question text is required');

        const [session] = await db.select().from(s.sessions).where(eq(s.sessions.id, Number(args.sessionId)));
        if (!session) throw new Error('Session not found');

        const [question] = await db.insert(s.questions).values({
          text: trimmedText,
          authorName: args.authorName?.trim().slice(0, MAX_NAME_LENGTH) || null,
          isApproved: !session.isModerated,
          sessionId: session.id,
        }).returning();

        return { ...question, upvoteCount: 0, replies: [] };
      },

      approveQuestion: async (_: unknown, { questionId }: { questionId: string }, { db }: Ctx) => {
        const [updated] = await db.update(s.questions).set({ isApproved: true }).where(eq(s.questions.id, Number(questionId))).returning();
        if (!updated) throw new Error('Question not found');
        return { ...updated, upvoteCount: 0, replies: [] };
      },

      rejectQuestion: async (_: unknown, { questionId }: { questionId: string }, { db }: Ctx) => {
        await db.delete(s.questions).where(eq(s.questions.id, Number(questionId)));
        return true;
      },

      highlightQuestion: async (_: unknown, { questionId, highlighted }: { questionId: string; highlighted: boolean }, { db }: Ctx) => {
        const [updated] = await db.update(s.questions).set({ isHighlighted: highlighted }).where(eq(s.questions.id, Number(questionId))).returning();
        if (!updated) throw new Error('Question not found');
        return { ...updated, upvoteCount: 0, replies: [] };
      },

      markAsAnswered: async (_: unknown, { questionId, answered }: { questionId: string; answered: boolean }, { db }: Ctx) => {
        const [updated] = await db.update(s.questions).set({ isAnswered: answered }).where(eq(s.questions.id, Number(questionId))).returning();
        if (!updated) throw new Error('Question not found');
        return { ...updated, upvoteCount: 0, replies: [] };
      },

      replyToQuestion: async (_: unknown, args: { questionId: string; text: string; authorName: string }, { db }: Ctx) => {
        const trimmedText = args.text.trim().slice(0, 2000);
        if (!trimmedText) throw new Error('Reply text is required');

        const [reply] = await db.insert(s.replies).values({
          text: trimmedText,
          authorName: args.authorName.trim().slice(0, MAX_NAME_LENGTH) || 'Host',
          questionId: Number(args.questionId),
        }).returning();

        return reply;
      },

      upvoteQuestion: async (_: unknown, args: { questionId: string; voterToken: string }, { db }: Ctx) => {
        const qid = Number(args.questionId);
        const sanitizedToken = args.voterToken.trim().slice(0, 64);
        if (!sanitizedToken) throw new Error('Voter token is required');

        const existing = await db.select().from(s.upvotes)
          .where(and(eq(s.upvotes.questionId, qid), eq(s.upvotes.voterToken, sanitizedToken)));

        if (!existing.length) {
          await db.insert(s.upvotes).values({ questionId: qid, voterToken: sanitizedToken });
        }

        const [question] = await db.select().from(s.questions).where(eq(s.questions.id, qid));
        if (!question) throw new Error('Question not found');
        return { ...question, upvoteCount: 0, replies: [] };
      },

      // ── Polls ──
      createPoll: async (_: unknown, args: { sessionId: string; type: string; question: string; options?: string[]; allowMultiple?: boolean }, { db }: Ctx) => {
        const [session] = await db.select().from(s.sessions).where(eq(s.sessions.id, Number(args.sessionId)));
        if (!session) throw new Error('Session not found');

        const [poll] = await db.insert(s.polls).values({
          type: args.type,
          question: args.question.trim().slice(0, 500),
          allowMultiple: args.allowMultiple ?? false,
          sessionId: session.id,
        }).returning();

        let options: (typeof s.pollOptions.$inferSelect)[] = [];
        if (args.options?.length) {
          options = await db.insert(s.pollOptions).values(
            args.options.map((text, i) => ({ text: text.trim().slice(0, 200), position: i, pollId: poll.id }))
          ).returning();
        }

        return { ...poll, options, responses: [], responseCount: 0 };
      },

      activatePoll: async (_: unknown, { pollId }: { pollId: string }, { db }: Ctx) => {
        const [updated] = await db.update(s.polls).set({ isActive: true }).where(eq(s.polls.id, Number(pollId))).returning();
        if (!updated) throw new Error('Poll not found');
        return loadPoll(db, updated.id);
      },

      deactivatePoll: async (_: unknown, { pollId }: { pollId: string }, { db }: Ctx) => {
        const [updated] = await db.update(s.polls).set({ isActive: false }).where(eq(s.polls.id, Number(pollId))).returning();
        if (!updated) throw new Error('Poll not found');
        return loadPoll(db, updated.id);
      },

      submitPollResponse: async (_: unknown, args: { pollId: string; voterToken: string; selectedOptionId?: string; textValue?: string; ratingValue?: number; rankingOrder?: string[] }, { db }: Ctx) => {
        const pid = Number(args.pollId);
        const [poll] = await db.select().from(s.polls).where(eq(s.polls.id, pid));
        if (!poll) throw new Error('Poll not found');
        if (!poll.isActive) throw new Error('Poll is not active');

        const existing = await db.select().from(s.pollResponses)
          .where(and(eq(s.pollResponses.pollId, pid), eq(s.pollResponses.voterToken, args.voterToken)));
        if (existing.length && !poll.allowMultiple) throw new Error('Already responded to this poll');

        await db.insert(s.pollResponses).values({
          pollId: pid,
          voterToken: args.voterToken,
          selectedOptionId: args.selectedOptionId ? Number(args.selectedOptionId) : null,
          textValue: args.textValue?.trim().slice(0, 500) || null,
          ratingValue: args.ratingValue != null ? Math.min(Math.max(args.ratingValue, 1), 5) : null,
          rankingOrder: args.rankingOrder ? JSON.stringify(args.rankingOrder) : null,
        });

        return true;
      },

      // ── Quiz ──
      createQuiz: async (_: unknown, args: { sessionId: string; title: string }, { db }: Ctx) => {
        const [session] = await db.select().from(s.sessions).where(eq(s.sessions.id, Number(args.sessionId)));
        if (!session) throw new Error('Session not found');

        const [quiz] = await db.insert(s.quizzes).values({
          title: args.title.trim().slice(0, 200),
          sessionId: session.id,
        }).returning();

        return { ...quiz, questions: [] };
      },

      addQuizQuestion: async (_: unknown, args: { quizId: string; text: string; options: string[]; correctOptionIndex: number; timeLimit?: number }, { db }: Ctx) => {
        const qzId = Number(args.quizId);
        const existingQs = await db.select().from(s.quizQuestions).where(eq(s.quizQuestions.quizId, qzId));
        const position = existingQs.length;

        const [question] = await db.insert(s.quizQuestions).values({
          text: args.text.trim().slice(0, 500),
          timeLimit: args.timeLimit ?? 20,
          position,
          quizId: qzId,
        }).returning();

        const options = await db.insert(s.quizOptions).values(
          args.options.map((t, i) => ({ text: t.trim().slice(0, 200), position: i, quizQuestionId: question.id }))
        ).returning();

        if (args.correctOptionIndex >= 0 && args.correctOptionIndex < options.length) {
          await db.update(s.quizQuestions).set({ correctOptionId: options[args.correctOptionIndex].id }).where(eq(s.quizQuestions.id, question.id));
          question.correctOptionId = options[args.correctOptionIndex].id;
        }

        return { ...question, options };
      },

      startQuiz: async (_: unknown, { quizId }: { quizId: string }, { db }: Ctx) => {
        const qzId = Number(quizId);
        const questions = await db.select().from(s.quizQuestions).where(eq(s.quizQuestions.quizId, qzId));
        if (!questions.length) throw new Error('Quiz has no questions');

        await db.update(s.quizzes).set({ isActive: true, currentQuestionIndex: 0 }).where(eq(s.quizzes.id, qzId));
        return loadQuiz(db, qzId);
      },

      nextQuizQuestion: async (_: unknown, { quizId }: { quizId: string }, { db }: Ctx) => {
        const qzId = Number(quizId);
        const quiz = await db.query.quizzes.findFirst({
          where: eq(s.quizzes.id, qzId),
          with: { questions: { with: { options: true }, orderBy: [asc(s.quizQuestions.position)] } },
        });
        if (!quiz) throw new Error('Quiz not found');

        const nextIndex = quiz.currentQuestionIndex + 1;
        if (nextIndex >= quiz.questions.length) {
          await db.update(s.quizzes).set({ isActive: false, currentQuestionIndex: -1 }).where(eq(s.quizzes.id, qzId));
        } else {
          await db.update(s.quizzes).set({ currentQuestionIndex: nextIndex }).where(eq(s.quizzes.id, qzId));
        }

        return loadQuiz(db, qzId);
      },

      submitQuizAnswer: async (_: unknown, args: { quizQuestionId: string; selectedOptionId: string; voterToken: string; answeredInMs: number }, { db }: Ctx) => {
        const qqId = Number(args.quizQuestionId);
        const [quizQuestion] = await db.select().from(s.quizQuestions).where(eq(s.quizQuestions.id, qqId));
        if (!quizQuestion) throw new Error('Quiz question not found');

        const existing = await db.select().from(s.quizAnswers)
          .where(and(eq(s.quizAnswers.quizQuestionId, qqId), eq(s.quizAnswers.voterToken, args.voterToken)));
        if (existing.length) throw new Error('Already answered this question');

        const isCorrect = Number(args.selectedOptionId) === quizQuestion.correctOptionId;
        const timeLimitMs = quizQuestion.timeLimit * 1000;
        const score = isCorrect ? Math.max(100, Math.round(1000 - (args.answeredInMs / timeLimitMs) * 900)) : 0;

        const [answer] = await db.insert(s.quizAnswers).values({
          quizQuestionId: qqId,
          selectedOptionId: Number(args.selectedOptionId),
          voterToken: args.voterToken,
          answeredInMs: args.answeredInMs,
          isCorrect,
          score,
        }).returning();

        return answer;
      },

      // ── Survey ──
      createSurvey: async (_: unknown, args: { sessionId: string; title: string }, { db }: Ctx) => {
        const [session] = await db.select().from(s.sessions).where(eq(s.sessions.id, Number(args.sessionId)));
        if (!session) throw new Error('Session not found');

        const [survey] = await db.insert(s.surveys).values({
          title: args.title.trim().slice(0, 200),
          sessionId: session.id,
        }).returning();

        return { ...survey, questions: [], responseCount: 0 };
      },

      addSurveyQuestion: async (_: unknown, args: { surveyId: string; type: string; text: string; options?: string[]; isRequired?: boolean }, { db }: Ctx) => {
        const svId = Number(args.surveyId);
        const existingQs = await db.select().from(s.surveyQuestions).where(eq(s.surveyQuestions.surveyId, svId));
        const position = existingQs.length;

        const [question] = await db.insert(s.surveyQuestions).values({
          type: args.type,
          text: args.text.trim().slice(0, 500),
          position,
          isRequired: args.isRequired ?? false,
          surveyId: svId,
        }).returning();

        let options: (typeof s.surveyOptions.$inferSelect)[] = [];
        if (args.options?.length && args.type === 'MULTIPLE_CHOICE') {
          options = await db.insert(s.surveyOptions).values(
            args.options.map((t, i) => ({ text: t.trim().slice(0, 200), position: i, surveyQuestionId: question.id }))
          ).returning();
        }

        return { ...question, options };
      },

      submitSurveyResponse: async (_: unknown, args: { surveyId: string; voterToken: string; answers: Array<{ surveyQuestionId: string; selectedOptionId?: string; textValue?: string; ratingValue?: number }> }, { db }: Ctx) => {
        const svId = Number(args.surveyId);
        const [survey] = await db.select().from(s.surveys).where(eq(s.surveys.id, svId));
        if (!survey) throw new Error('Survey not found');
        if (!survey.isOpen) throw new Error('Survey is closed');

        const existing = await db.select().from(s.surveyResponses)
          .where(and(eq(s.surveyResponses.surveyId, svId), eq(s.surveyResponses.voterToken, args.voterToken)));
        if (existing.length) throw new Error('Already submitted a response');

        const [response] = await db.insert(s.surveyResponses).values({
          surveyId: svId,
          voterToken: args.voterToken,
        }).returning();

        const answers = [];
        for (const input of args.answers) {
          const [answer] = await db.insert(s.surveyAnswers).values({
            surveyResponseId: response.id,
            surveyQuestionId: Number(input.surveyQuestionId),
            selectedOptionId: input.selectedOptionId ? Number(input.selectedOptionId) : null,
            textValue: input.textValue?.trim().slice(0, 2000) || null,
            ratingValue: input.ratingValue != null ? Math.min(Math.max(input.ratingValue, 1), 5) : null,
          }).returning();
          answers.push(answer);
        }

        return { ...response, answers };
      },

      closeSurvey: async (_: unknown, { surveyId }: { surveyId: string }, { db }: Ctx) => {
        const [updated] = await db.update(s.surveys).set({ isOpen: false }).where(eq(s.surveys.id, Number(surveyId))).returning();
        if (!updated) throw new Error('Survey not found');
        return { ...updated, responseCount: 0, questions: [] };
      },
    },

    // ── Field Resolvers ──
    Question: {
      upvoteCount: async (parent: { id: number; _upvoteCount?: number }, _: unknown, { db }: Ctx) => {
        if (parent._upvoteCount !== undefined) return parent._upvoteCount;
        const [result] = await db.select({ c: count() }).from(s.upvotes).where(eq(s.upvotes.questionId, parent.id));
        return result.c;
      },
      replies: async (parent: { id: number; replies?: unknown[] }, _: unknown, { db }: Ctx) => {
        if (parent.replies && Array.isArray(parent.replies)) return parent.replies;
        return db.select().from(s.replies).where(eq(s.replies.questionId, parent.id));
      },
    },

    Poll: {
      responseCount: async (parent: { id: number; _responseCount?: number }, _: unknown, { db }: Ctx) => {
        if (parent._responseCount !== undefined) return parent._responseCount;
        const [result] = await db.select({ c: count() }).from(s.pollResponses).where(eq(s.pollResponses.pollId, parent.id));
        return result.c;
      },
    },

    PollOption: {
      voteCount: async (parent: { id: number; _voteCount?: number }, _: unknown, { db }: Ctx) => {
        if (parent._voteCount !== undefined) return parent._voteCount;
        const [result] = await db.select({ c: count() }).from(s.pollResponses).where(eq(s.pollResponses.selectedOptionId, parent.id));
        return result.c;
      },
    },

    PollResponse: {
      rankingOrder: (parent: { rankingOrder: string | null }) => {
        if (!parent.rankingOrder) return null;
        try { return JSON.parse(parent.rankingOrder); } catch { return null; }
      },
    },

    Survey: {
      responseCount: async (parent: { id: number }, _: unknown, { db }: Ctx) => {
        const [result] = await db.select({ c: count() }).from(s.surveyResponses).where(eq(s.surveyResponses.surveyId, parent.id));
        return result.c;
      },
    },
  },
});

// ── Helpers ──

type Ctx = { db: Db };

async function loadPoll(db: Db, pollId: number) {
  return db.query.polls.findFirst({
    where: eq(s.polls.id, pollId),
    with: { options: true, responses: { with: { selectedOption: true } } },
  });
}

async function loadQuiz(db: Db, quizId: number) {
  return db.query.quizzes.findFirst({
    where: eq(s.quizzes.id, quizId),
    with: { questions: { with: { options: true }, orderBy: [asc(s.quizQuestions.position)] } },
  });
}

// ── DB Context ──

let _localDb: Db | null = null;

async function getDbFromContext(): Promise<Db> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext();
    return getDb(ctx.env.DB);
  } catch {
    if (!_localDb) {
      const { default: Database } = await import('better-sqlite3');
      const { readdirSync } = await import('node:fs');
      const { join } = await import('node:path');
      const d1Dir = join(process.cwd(), '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
      const files = readdirSync(d1Dir).filter((f: string) => f.endsWith('.sqlite') && f !== 'metadata.sqlite');
      if (!files.length) throw new Error('No local D1 database found. Run `npm run db:migrate` first.');
      const sqliteDb = new Database(join(d1Dir, files[0]));
      sqliteDb.pragma('journal_mode = WAL');
      sqliteDb.pragma('foreign_keys = ON');
      const { drizzle } = await import('drizzle-orm/better-sqlite3');
      const schemaImport = await import('@/db/schema');
      _localDb = drizzle(sqliteDb, { schema: schemaImport }) as unknown as Db;
    }
    return _localDb;
  }
}

// ── Yoga Handler ──

const yoga = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Response },
  context: async () => {
    const db = await getDbFromContext();
    return { db };
  },
});

export async function GET(request: Request) {
  return yoga.handle(request);
}

export async function POST(request: Request) {
  return yoga.handle(request);
}
