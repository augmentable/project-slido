import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

// ── Users ──

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

// ── Sessions ──

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  isModerated: integer('is_moderated', { mode: 'boolean' }).default(false).notNull(),
  passcodeHash: text('passcode_hash'),
  primaryColor: text('primary_color'),
  logoUrl: text('logo_url'),
  ownerId: integer('owner_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  pollsEnabled: integer('polls_enabled', { mode: 'boolean' }).default(false).notNull(),
  quizzesEnabled: integer('quizzes_enabled', { mode: 'boolean' }).default(false).notNull(),
  repliesEnabled: integer('replies_enabled', { mode: 'boolean' }).default(false).notNull(),
  surveysEnabled: integer('surveys_enabled', { mode: 'boolean' }).default(false).notNull(),
  votesEnabled: integer('votes_enabled', { mode: 'boolean' }).default(true).notNull(),
  saturdayBannerEnabled: integer('saturday_banner_enabled', { mode: 'boolean' }).default(true).notNull(),
  reactionsEnabled: integer('reactions_enabled', { mode: 'boolean' }).default(false).notNull(),
});

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  owner: one(users, { fields: [sessions.ownerId], references: [users.id] }),
  questions: many(questions),
  polls: many(polls),
  quizzes: many(quizzes),
  surveys: many(surveys),
}));

// ── Questions ──

export const questions = sqliteTable('questions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  text: text('text').notNull(),
  authorName: text('author_name'),
  isApproved: integer('is_approved', { mode: 'boolean' }).default(true).notNull(),
  isHighlighted: integer('is_highlighted', { mode: 'boolean' }).default(false).notNull(),
  isAnswered: integer('is_answered', { mode: 'boolean' }).default(false).notNull(),
  sessionId: integer('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const questionsRelations = relations(questions, ({ one, many }) => ({
  session: one(sessions, { fields: [questions.sessionId], references: [sessions.id] }),
  upvotes: many(upvotes),
  reactions: many(questionReactions),
  replies: many(replies),
}));

// ── Upvotes ──

export const upvotes = sqliteTable('upvotes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  voterToken: text('voter_token').notNull(),
  questionId: integer('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  value: integer('value').default(1).notNull(),
}, (t) => [
  uniqueIndex('upvotes_voter_question_idx').on(t.voterToken, t.questionId),
]);

export const upvotesRelations = relations(upvotes, ({ one }) => ({
  question: one(questions, { fields: [upvotes.questionId], references: [questions.id] }),
}));

// ── Question Reactions ──

export const questionReactions = sqliteTable('question_reactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  voterToken: text('voter_token').notNull(),
  questionId: integer('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  emoji: text('emoji').notNull(),
}, (t) => [
  uniqueIndex('question_reactions_voter_question_emoji_idx').on(t.voterToken, t.questionId, t.emoji),
]);

export const questionReactionsRelations = relations(questionReactions, ({ one }) => ({
  question: one(questions, { fields: [questionReactions.questionId], references: [questions.id] }),
}));

// ── Replies ──

export const replies = sqliteTable('replies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  text: text('text').notNull(),
  authorName: text('author_name').notNull(),
  questionId: integer('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const repliesRelations = relations(replies, ({ one }) => ({
  question: one(questions, { fields: [replies.questionId], references: [questions.id] }),
}));

// ── Polls ──

export const polls = sqliteTable('polls', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(), // MULTIPLE_CHOICE | WORD_CLOUD | RATING | OPEN_TEXT | RANKING
  question: text('question').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(false).notNull(),
  allowMultiple: integer('allow_multiple', { mode: 'boolean' }).default(false).notNull(),
  sessionId: integer('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const pollsRelations = relations(polls, ({ one, many }) => ({
  session: one(sessions, { fields: [polls.sessionId], references: [sessions.id] }),
  options: many(pollOptions),
  responses: many(pollResponses),
}));

// ── Poll Options ──

export const pollOptions = sqliteTable('poll_options', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  text: text('text').notNull(),
  position: integer('position').default(0).notNull(),
  pollId: integer('poll_id').notNull().references(() => polls.id, { onDelete: 'cascade' }),
});

export const pollOptionsRelations = relations(pollOptions, ({ one }) => ({
  poll: one(polls, { fields: [pollOptions.pollId], references: [polls.id] }),
}));

// ── Poll Responses ──

export const pollResponses = sqliteTable('poll_responses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  voterToken: text('voter_token').notNull(),
  pollId: integer('poll_id').notNull().references(() => polls.id, { onDelete: 'cascade' }),
  selectedOptionId: integer('selected_option_id').references(() => pollOptions.id, { onDelete: 'cascade' }),
  textValue: text('text_value'),
  ratingValue: integer('rating_value'),
  rankingOrder: text('ranking_order'), // JSON string
}, (t) => [
  uniqueIndex('poll_responses_voter_poll_idx').on(t.voterToken, t.pollId),
]);

export const pollResponsesRelations = relations(pollResponses, ({ one }) => ({
  poll: one(polls, { fields: [pollResponses.pollId], references: [polls.id] }),
  selectedOption: one(pollOptions, { fields: [pollResponses.selectedOptionId], references: [pollOptions.id] }),
}));

// ── Quizzes ──

export const quizzes = sqliteTable('quizzes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(false).notNull(),
  currentQuestionIndex: integer('current_question_index').default(-1).notNull(),
  sessionId: integer('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  session: one(sessions, { fields: [quizzes.sessionId], references: [sessions.id] }),
  questions: many(quizQuestions),
}));

// ── Quiz Questions ──

export const quizQuestions = sqliteTable('quiz_questions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  text: text('text').notNull(),
  timeLimit: integer('time_limit').default(20).notNull(),
  position: integer('position').default(0).notNull(),
  correctOptionId: integer('correct_option_id'),
  quizId: integer('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
});

export const quizQuestionsRelations = relations(quizQuestions, ({ one, many }) => ({
  quiz: one(quizzes, { fields: [quizQuestions.quizId], references: [quizzes.id] }),
  options: many(quizOptions),
  answers: many(quizAnswers),
}));

// ── Quiz Options ──

export const quizOptions = sqliteTable('quiz_options', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  text: text('text').notNull(),
  position: integer('position').default(0).notNull(),
  quizQuestionId: integer('quiz_question_id').notNull().references(() => quizQuestions.id, { onDelete: 'cascade' }),
});

export const quizOptionsRelations = relations(quizOptions, ({ one }) => ({
  quizQuestion: one(quizQuestions, { fields: [quizOptions.quizQuestionId], references: [quizQuestions.id] }),
}));

// ── Quiz Answers ──

export const quizAnswers = sqliteTable('quiz_answers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  voterToken: text('voter_token').notNull(),
  quizQuestionId: integer('quiz_question_id').notNull().references(() => quizQuestions.id, { onDelete: 'cascade' }),
  selectedOptionId: integer('selected_option_id').references(() => quizOptions.id, { onDelete: 'cascade' }),
  answeredInMs: integer('answered_in_ms').default(0).notNull(),
  isCorrect: integer('is_correct', { mode: 'boolean' }).default(false).notNull(),
  score: integer('score').default(0).notNull(),
}, (t) => [
  uniqueIndex('quiz_answers_voter_question_idx').on(t.voterToken, t.quizQuestionId),
]);

export const quizAnswersRelations = relations(quizAnswers, ({ one }) => ({
  quizQuestion: one(quizQuestions, { fields: [quizAnswers.quizQuestionId], references: [quizQuestions.id] }),
  selectedOption: one(quizOptions, { fields: [quizAnswers.selectedOptionId], references: [quizOptions.id] }),
}));

// ── Surveys ──

export const surveys = sqliteTable('surveys', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  isOpen: integer('is_open', { mode: 'boolean' }).default(true).notNull(),
  sessionId: integer('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const surveysRelations = relations(surveys, ({ one, many }) => ({
  session: one(sessions, { fields: [surveys.sessionId], references: [sessions.id] }),
  questions: many(surveyQuestions),
  responses: many(surveyResponses),
}));

// ── Survey Questions ──

export const surveyQuestions = sqliteTable('survey_questions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(), // MULTIPLE_CHOICE | OPEN_TEXT | RATING
  text: text('text').notNull(),
  position: integer('position').default(0).notNull(),
  isRequired: integer('is_required', { mode: 'boolean' }).default(false).notNull(),
  surveyId: integer('survey_id').notNull().references(() => surveys.id, { onDelete: 'cascade' }),
});

export const surveyQuestionsRelations = relations(surveyQuestions, ({ one, many }) => ({
  survey: one(surveys, { fields: [surveyQuestions.surveyId], references: [surveys.id] }),
  options: many(surveyOptions),
}));

// ── Survey Options ──

export const surveyOptions = sqliteTable('survey_options', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  text: text('text').notNull(),
  position: integer('position').default(0).notNull(),
  surveyQuestionId: integer('survey_question_id').notNull().references(() => surveyQuestions.id, { onDelete: 'cascade' }),
});

export const surveyOptionsRelations = relations(surveyOptions, ({ one }) => ({
  surveyQuestion: one(surveyQuestions, { fields: [surveyOptions.surveyQuestionId], references: [surveyQuestions.id] }),
}));

// ── Survey Responses ──

export const surveyResponses = sqliteTable('survey_responses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  voterToken: text('voter_token').notNull(),
  surveyId: integer('survey_id').notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  submittedAt: text('submitted_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (t) => [
  uniqueIndex('survey_responses_voter_survey_idx').on(t.voterToken, t.surveyId),
]);

export const surveyResponsesRelations = relations(surveyResponses, ({ one, many }) => ({
  survey: one(surveys, { fields: [surveyResponses.surveyId], references: [surveys.id] }),
  answers: many(surveyAnswers),
}));

// ── Survey Answers ──

export const surveyAnswers = sqliteTable('survey_answers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  surveyResponseId: integer('survey_response_id').notNull().references(() => surveyResponses.id, { onDelete: 'cascade' }),
  surveyQuestionId: integer('survey_question_id').notNull().references(() => surveyQuestions.id, { onDelete: 'cascade' }),
  selectedOptionId: integer('selected_option_id').references(() => surveyOptions.id, { onDelete: 'cascade' }),
  textValue: text('text_value'),
  ratingValue: integer('rating_value'),
});

export const surveyAnswersRelations = relations(surveyAnswers, ({ one }) => ({
  surveyResponse: one(surveyResponses, { fields: [surveyAnswers.surveyResponseId], references: [surveyResponses.id] }),
  surveyQuestion: one(surveyQuestions, { fields: [surveyAnswers.surveyQuestionId], references: [surveyQuestions.id] }),
  selectedOption: one(surveyOptions, { fields: [surveyAnswers.selectedOptionId], references: [surveyOptions.id] }),
}));

// ── App Settings ──

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});
