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

const MAX_QUESTION_LENGTH = 2000;
const MAX_TOKEN_LENGTH = 64;

@Resolver(() => Question)
export class QuestionResolver {
  private questionRepo = AppDataSource.getRepository(Question);
  private sessionRepo = AppDataSource.getRepository(Session);
  private upvoteRepo = AppDataSource.getRepository(Upvote);

  @FieldResolver(() => Number)
  async upvoteCount(@Root() question: Question): Promise<number> {
    return this.upvoteRepo.count({
      where: { question: { id: question.id } },
    });
  }

  @Mutation(() => Question)
  async createQuestion(
    @Arg('sessionId', () => String) sessionId: string,
    @Arg('text', () => String) text: string,
  ): Promise<Question> {
    const trimmedText = text.trim().slice(0, MAX_QUESTION_LENGTH);
    if (!trimmedText) throw new Error('Question text is required');

    const session = await this.sessionRepo.findOneBy({ id: sessionId });
    if (!session) throw new Error('Session not found');

    const question = this.questionRepo.create({ text: trimmedText, session });
    const savedQuestion = await this.questionRepo.save(question);

    pubSub.publish('NEW_QUESTION', session.id, savedQuestion);

    return savedQuestion;
  }

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

  @Mutation(() => Question)
  async upvoteQuestion(
    @Arg('questionId', () => String) questionId: string,
    @Arg('voterToken', () => String) voterToken: string,
  ): Promise<Question> {
    const sanitizedToken = voterToken.trim().slice(0, MAX_TOKEN_LENGTH);
    if (!sanitizedToken) throw new Error('Voter token is required');

    const question = await this.questionRepo.findOne({
      where: { id: questionId },
      relations: { session: true },
    });

    if (!question) throw new Error('Question not found');

    const existingUpvote = await this.upvoteRepo.findOne({
      where: { question: { id: questionId }, voterToken: sanitizedToken },
    });

    if (!existingUpvote) {
      const upvote = this.upvoteRepo.create({ question, voterToken: sanitizedToken });
      await this.upvoteRepo.save(upvote);
    }

    pubSub.publish('QUESTION_UPVOTED', question.session.id, question);

    return question;
  }

  @Subscription(() => Question, {
    topics: 'QUESTION_UPVOTED',
    topicId: ({ args }) => args.sessionId,
  })
  questionUpvoted(
    @Root() questionPayload: Question,
    @Arg('sessionId', () => String) sessionId: string,
  ): Question {
    return questionPayload;
  }
}
