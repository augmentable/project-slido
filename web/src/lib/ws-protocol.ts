// ── Client → Durable Object messages ──

export type ClientMessage =
  | { type: 'subscribe'; code: string }
  | { type: 'vote'; questionId: number; voterToken: string; value: 1 | -1 }
  | { type: 'react'; questionId: number; voterToken: string; emoji: string }
  | { type: 'createQuestion'; title: string; text?: string; authorName?: string }
  | { type: 'submitPollResponse'; pollId: number; voterToken: string; selectedOptionId?: number; textValue?: string; ratingValue?: number; rankingOrder?: string[] }
  | { type: 'submitQuizAnswer'; quizQuestionId: number; selectedOptionId: number; voterToken: string; answeredInMs: number }
  | { type: 'refresh' };

// ── Durable Object → Client messages ──

export interface SessionState {
  id: number;
  code: string;
  title: string;
  isModerated: boolean;
  isPasswordProtected: boolean;
  pollsEnabled: boolean;
  quizzesEnabled: boolean;
  repliesEnabled: boolean;
  surveysEnabled: boolean;
  votesEnabled: boolean;
  saturdayBannerEnabled: boolean;
  reactionsEnabled: boolean;
  primaryColor: string | null;
  logoUrl: string | null;
  owner: { id: number; displayName: string } | null;
  questions: QuestionState[];
  polls: PollState[];
  quizzes: QuizState[];
  surveys: SurveyState[];
}

export interface QuestionState {
  id: number;
  title: string;
  text: string;
  authorName: string | null;
  isApproved: boolean;
  isHighlighted: boolean;
  isAnswered: boolean;
  upvoteCount: number;
  downvoteCount: number;
  score: number;
  reactions: { emoji: string; count: number }[];
  replies: ReplyState[];
  createdAt: string;
}

export interface ReplyState {
  id: number;
  text: string;
  authorName: string;
  createdAt: string;
}

export interface PollState {
  id: number;
  type: string;
  question: string;
  isActive: boolean;
  allowMultiple: boolean;
  responseCount: number;
  options: PollOptionState[];
}

export interface PollOptionState {
  id: number;
  text: string;
  position: number;
  voteCount: number;
}

export interface QuizState {
  id: number;
  title: string;
  isActive: boolean;
  currentQuestionIndex: number;
  questions: QuizQuestionState[];
}

export interface QuizQuestionState {
  id: number;
  text: string;
  timeLimit: number;
  position: number;
  options: { id: number; text: string; position: number }[];
}

export interface SurveyState {
  id: number;
  title: string;
  isOpen: boolean;
  questions: { id: number; type: string; text: string; position: number; isRequired: boolean; options: { id: number; text: string; position: number }[] }[];
}

export type ServerMessage =
  | { type: 'state'; data: SessionState }
  | { type: 'error'; message: string; action?: string };
