import { createPubSub } from '@graphql-yoga/subscription';
import { Question } from './entities/Question';
import { Poll } from './entities/Poll';
import { Quiz } from './entities/Quiz';

export type PubSubChannels = {
  QUESTION_UPVOTED: [string, Question];
  NEW_QUESTION: [string, Question];
  QUESTION_MODERATED: [string, Question];
  POLL_UPDATED: [string, Poll];
  QUIZ_STATE_CHANGED: [string, Quiz];
};

export const pubSub = createPubSub<PubSubChannels>();
