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
import { Reply } from '../entities/Reply';
import { AppDataSource } from '../data-source';
import { pubSub } from '../pubsub';

const MAX_QUESTION_LENGTH = 2000;
const MAX_TOKEN_LENGTH = 64;
const MAX_NAME_LENGTH = 100;

@Resolver(() => Question)
export class QuestionResolver {
  private questionRepo = AppDataSource.getRepository(Question);
  private sessionRepo = AppDataSource.getRepository(Session);
  private upvoteRepo = AppDataSource.getRepository(Upvote);
  private replyRepo = AppDataSource.getRepository(Reply);

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
    @Arg('authorName', () => String, { nullable: true }) authorName?: string,
  ): Promise<Question> {
    const trimmedText = text.trim().slice(0, MAX_QUESTION_LENGTH);
    if (!trimmedText) throw new Error('Question text is required');

    const session = await this.sessionRepo.findOneBy({ id: sessionId });
    if (!session) throw new Error('Session not found');

    const trimmedName = authorName?.trim().slice(0, MAX_NAME_LENGTH) || null;
    const isApproved = !session.isModerated;

    const question = this.questionRepo.create({
      text: trimmedText,
      authorName: trimmedName,
      isApproved,
      session,
    });
    const savedQuestion = await this.questionRepo.save(question);

    if (isApproved) {
      pubSub.publish('NEW_QUESTION', session.id, savedQuestion);
    }

    return savedQuestion;
  }

  @Mutation(() => Question)
  async approveQuestion(
    @Arg('questionId', () => String) questionId: string,
  ): Promise<Question> {
    const question = await this.questionRepo.findOne({
      where: { id: questionId },
      relations: { session: true },
    });
    if (!question) throw new Error('Question not found');

    question.isApproved = true;
    const saved = await this.questionRepo.save(question);
    pubSub.publish('NEW_QUESTION', question.session.id, saved);
    return saved;
  }

  @Mutation(() => Boolean)
  async rejectQuestion(
    @Arg('questionId', () => String) questionId: string,
  ): Promise<boolean> {
    const question = await this.questionRepo.findOneBy({ id: questionId });
    if (!question) throw new Error('Question not found');
    await this.questionRepo.remove(question);
    return true;
  }

  @Mutation(() => Question)
  async highlightQuestion(
    @Arg('questionId', () => String) questionId: string,
    @Arg('highlighted', () => Boolean) highlighted: boolean,
  ): Promise<Question> {
    const question = await this.questionRepo.findOne({
      where: { id: questionId },
      relations: { session: true },
    });
    if (!question) throw new Error('Question not found');

    question.isHighlighted = highlighted;
    const saved = await this.questionRepo.save(question);
    pubSub.publish('QUESTION_MODERATED', question.session.id, saved);
    return saved;
  }

  @Mutation(() => Question)
  async markAsAnswered(
    @Arg('questionId', () => String) questionId: string,
    @Arg('answered', () => Boolean) answered: boolean,
  ): Promise<Question> {
    const question = await this.questionRepo.findOne({
      where: { id: questionId },
      relations: { session: true },
    });
    if (!question) throw new Error('Question not found');

    question.isAnswered = answered;
    const saved = await this.questionRepo.save(question);
    pubSub.publish('QUESTION_MODERATED', question.session.id, saved);
    return saved;
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

  @Subscription(() => Question, {
    topics: 'QUESTION_MODERATED',
    topicId: ({ args }) => args.sessionId,
  })
  questionModerated(
    @Root() questionPayload: Question,
    @Arg('sessionId', () => String) sessionId: string,
  ): Question {
    return questionPayload;
  }

  @Mutation(() => Reply)
  async replyToQuestion(
    @Arg('questionId', () => String) questionId: string,
    @Arg('text', () => String) text: string,
    @Arg('authorName', () => String) authorName: string,
  ): Promise<Reply> {
    const trimmedText = text.trim().slice(0, 2000);
    if (!trimmedText) throw new Error('Reply text is required');

    const question = await this.questionRepo.findOne({
      where: { id: questionId },
      relations: { session: true },
    });
    if (!question) throw new Error('Question not found');

    const reply = this.replyRepo.create({
      text: trimmedText,
      authorName: authorName.trim().slice(0, MAX_NAME_LENGTH) || 'Host',
      question,
    });
    const saved = await this.replyRepo.save(reply);
    pubSub.publish('QUESTION_MODERATED', question.session.id, question);
    return saved;
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
