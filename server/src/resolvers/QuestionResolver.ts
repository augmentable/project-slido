import {
  Resolver,
  Mutation,
  Arg,
  FieldResolver,
  Root,
  Subscription,
} from 'type-graphql';
import { Question } from '../entities/Question';
import { Session } from '../entities/Session';
import { Upvote } from '../entities/Upvote';
import { AppDataSource } from '../data-source';
import { pubSub } from '../pubsub';

@Resolver(() => Question)
export class QuestionResolver {
  private questionRepo = AppDataSource.getRepository(Question);
  private sessionRepo = AppDataSource.getRepository(Session);
  private upvoteRepo = AppDataSource.getRepository(Upvote);

  // FIELD RESOLVER: Resolves `upvoteCount` whenever a client requests it
  @FieldResolver(() => Number)
  async upvoteCount(@Root() question: Question): Promise<number> {
    return this.upvoteRepo.count({
      where: { question: { id: question.id } },
    });
  }

  // MUTATION: Add a question to a session
  @Mutation(() => Question)
  async createQuestion(
    @Arg('sessionId', () => String) sessionId: string,
    @Arg('text', () => String) text: string,
  ): Promise<Question> {
    const session = await this.sessionRepo.findOneBy({ id: sessionId });
    if (!session) {
      throw new Error('Session not found');
    }

    const question = this.questionRepo.create({ text, session });
    const savedQuestion = await this.questionRepo.save(question);

    // Publish event so all connected clients get the new question live!
    pubSub.publish('NEW_QUESTION', session.id, savedQuestion);

    return savedQuestion;
  }

  // SUBSCRIPTION: Listen for new questions created in a specific session
  @Subscription(() => Question, {
    topics: 'NEW_QUESTION',
    topicId: ({ args }) => args.sessionId,
  })
  questionCreated(
    @Root() questionPayload: Question,
    @Arg('sessionId', () => String) sessionId: string,
  ): Question {
    return questionPayload;
  }
  // MUTATION: Upvote a question (Deduplicated by voterToken)
  // @Mutation(() => Boolean)
  // async upvoteQuestion(
  //   @Arg('questionId', () => String) questionId: string,
  //   @Arg('voterToken', () => String) voterToken: string,
  // ): Promise<boolean> {
  //   const question = await this.questionRepo.findOneBy({ id: questionId });
  //   if (!question) {
  //     throw new Error('Question not found');
  //   }

  //   // Check if user already upvoted
  //   const existing = await this.upvoteRepo.findOne({
  //     where: { voterToken, question: { id: questionId } },
  //   });

  //   if (existing) {
  //     // Remove upvote if toggled off
  //     await this.upvoteRepo.remove(existing);
  //     return false;
  //   }

  //   // Add upvote
  //   const upvote = this.upvoteRepo.create({ voterToken, question });
  //   await this.upvoteRepo.save(upvote);
  //   return true;
  // }

  // MUTATION: Upvote a Question
  @Mutation(() => Question)
  async upvoteQuestion(
    @Arg('questionId', () => String) questionId: string,
    @Arg('voterToken', () => String) voterToken: string,
  ): Promise<Question> {
    const question = await this.questionRepo.findOne({
      where: { id: questionId },
      relations: { session: true },
    });

    if (!question) {
      throw new Error('Question not found');
    }

    // Check if user already upvoted
    const existingUpvote = await this.upvoteRepo.findOne({
      where: { question: { id: questionId }, voterToken },
    });

    if (!existingUpvote) {
      const upvote = this.upvoteRepo.create({ question, voterToken });
      await this.upvoteRepo.save(upvote);
    }

    // Publish event scoped to this session's ID using dynamic topicId
    pubSub.publish('QUESTION_UPVOTED', question.session.id, question);

    return question;
  }

  // SUBSCRIPTION: Listen for live upvotes in a specific session
  @Subscription(() => Question, {
    topics: 'QUESTION_UPVOTED',
    topicId: ({ args }) => args.sessionId, // Scopes subscription to specific session ID
  })
  questionUpvoted(
    @Root() questionPayload: Question,
    @Arg('sessionId', () => String) sessionId: string,
  ): Question {
    return questionPayload;
  }
}
