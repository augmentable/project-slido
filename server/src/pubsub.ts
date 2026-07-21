import { createPubSub } from '@graphql-yoga/subscription';
import { Question } from './entities/Question';

// Define our topics and their payload types:
// TOPIC_NAME: [topicId (string/number), payload]
export type PubSubChannels = {
  QUESTION_UPVOTED: [string, Question]; // [sessionId, updatedQuestion]
  NEW_QUESTION: [string, Question]; // [sessionId, newQuestion]
};

export const pubSub = createPubSub<PubSubChannels>();
