import {
  Resolver,
  Query,
  Mutation,
  Arg,
  FieldResolver,
  Root,
  Subscription,
} from 'type-graphql';
import { Poll, PollType } from '../entities/Poll';
import { PollOption } from '../entities/PollOption';
import { PollResponse } from '../entities/PollResponse';
import { Session } from '../entities/Session';
import { AppDataSource } from '../data-source';
import { pubSub } from '../pubsub';

@Resolver(() => Poll)
export class PollResolver {
  private pollRepo = AppDataSource.getRepository(Poll);
  private optionRepo = AppDataSource.getRepository(PollOption);
  private responseRepo = AppDataSource.getRepository(PollResponse);
  private sessionRepo = AppDataSource.getRepository(Session);

  @FieldResolver(() => Number)
  async responseCount(@Root() poll: Poll): Promise<number> {
    return this.responseRepo.count({ where: { poll: { id: poll.id } } });
  }

  @Query(() => Poll, { nullable: true })
  async poll(@Arg('pollId', () => String) pollId: string): Promise<Poll | null> {
    return this.pollRepo.findOne({
      where: { id: pollId },
      relations: { options: true, responses: { selectedOption: true } },
    });
  }

  @Mutation(() => Poll)
  async createPoll(
    @Arg('sessionId', () => String) sessionId: string,
    @Arg('type', () => PollType) type: PollType,
    @Arg('question', () => String) question: string,
    @Arg('options', () => [String], { nullable: true }) optionTexts?: string[],
    @Arg('allowMultiple', () => Boolean, { nullable: true }) allowMultiple?: boolean,
  ): Promise<Poll> {
    const session = await this.sessionRepo.findOneBy({ id: sessionId });
    if (!session) throw new Error('Session not found');

    const poll = this.pollRepo.create({
      type,
      question: question.trim().slice(0, 500),
      allowMultiple: allowMultiple ?? false,
      session,
    });
    const savedPoll = await this.pollRepo.save(poll);

    if (optionTexts?.length) {
      const options = optionTexts.map((text, i) =>
        this.optionRepo.create({ text: text.trim().slice(0, 200), position: i, poll: savedPoll }),
      );
      await this.optionRepo.save(options);
      savedPoll.options = options;
    } else {
      savedPoll.options = [];
    }

    return savedPoll;
  }

  @Mutation(() => Poll)
  async activatePoll(
    @Arg('pollId', () => String) pollId: string,
  ): Promise<Poll> {
    const poll = await this.pollRepo.findOne({
      where: { id: pollId },
      relations: { session: true, options: true },
    });
    if (!poll) throw new Error('Poll not found');

    poll.isActive = true;
    const saved = await this.pollRepo.save(poll);
    pubSub.publish('POLL_UPDATED', poll.session.id, saved);
    return saved;
  }

  @Mutation(() => Poll)
  async deactivatePoll(
    @Arg('pollId', () => String) pollId: string,
  ): Promise<Poll> {
    const poll = await this.pollRepo.findOne({
      where: { id: pollId },
      relations: { session: true, options: true },
    });
    if (!poll) throw new Error('Poll not found');

    poll.isActive = false;
    const saved = await this.pollRepo.save(poll);
    pubSub.publish('POLL_UPDATED', poll.session.id, saved);
    return saved;
  }

  @Mutation(() => Boolean)
  async submitPollResponse(
    @Arg('pollId', () => String) pollId: string,
    @Arg('voterToken', () => String) voterToken: string,
    @Arg('selectedOptionId', () => String, { nullable: true }) selectedOptionId?: string,
    @Arg('textValue', () => String, { nullable: true }) textValue?: string,
    @Arg('ratingValue', () => Number, { nullable: true }) ratingValue?: number,
    @Arg('rankingOrder', () => [String], { nullable: true }) rankingOrder?: string[],
  ): Promise<boolean> {
    const poll = await this.pollRepo.findOne({
      where: { id: pollId },
      relations: { session: true, options: true },
    });
    if (!poll) throw new Error('Poll not found');
    if (!poll.isActive) throw new Error('Poll is not active');

    const existing = await this.responseRepo.findOne({
      where: { poll: { id: pollId }, voterToken },
    });
    if (existing && !poll.allowMultiple) throw new Error('Already responded to this poll');

    let selectedOption: PollOption | null = null;
    if (selectedOptionId) {
      selectedOption = await this.optionRepo.findOneBy({ id: selectedOptionId });
    }

    const response = this.responseRepo.create({
      poll,
      voterToken,
      selectedOption,
      textValue: textValue?.trim().slice(0, 500) || null,
      ratingValue: ratingValue != null ? Math.min(Math.max(ratingValue, 1), 5) : null,
      rankingOrder: rankingOrder || null,
    });
    await this.responseRepo.save(response);

    pubSub.publish('POLL_UPDATED', poll.session.id, poll);
    return true;
  }

  @Subscription(() => Poll, {
    topics: 'POLL_UPDATED',
    topicId: ({ args }) => args.sessionId,
  })
  pollUpdated(
    @Root() pollPayload: Poll,
    @Arg('sessionId', () => String) sessionId: string,
  ): Poll {
    return pollPayload;
  }
}

@Resolver(() => PollOption)
export class PollOptionResolver {
  private responseRepo = AppDataSource.getRepository(PollResponse);

  @FieldResolver(() => Number)
  async voteCount(@Root() option: PollOption): Promise<number> {
    return this.responseRepo.count({
      where: { selectedOption: { id: option.id } },
    });
  }
}
