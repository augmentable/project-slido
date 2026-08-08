import { Resolver, Query, Mutation, Arg } from 'type-graphql';
import { Session } from '../entities/Session';
import { AppDataSource } from '../data-source';

const MAX_TITLE_LENGTH = 200;
const MAX_CODE_LENGTH = 32;
const CODE_PATTERN = /^[A-Z0-9_-]+$/;

@Resolver(() => Session)
export class SessionResolver {
  private sessionRepo = AppDataSource.getRepository(Session);

  @Query(() => Session, { nullable: true })
  async session(
    @Arg('code', () => String) code: string,
  ): Promise<Session | null> {
    const sanitized = code.trim().toUpperCase().slice(0, MAX_CODE_LENGTH);
    if (!CODE_PATTERN.test(sanitized)) return null;

    return this.sessionRepo.findOne({
      where: { code: sanitized },
      relations: { questions: true },
    });
  }

  @Mutation(() => Session)
  async createSession(
    @Arg('title', () => String) title: string,
    @Arg('code', () => String) code: string,
  ): Promise<Session> {
    const trimmedTitle = title.trim().slice(0, MAX_TITLE_LENGTH);
    const trimmedCode = code.trim().toUpperCase().slice(0, MAX_CODE_LENGTH);

    if (!trimmedTitle) throw new Error('Title is required');
    if (!trimmedCode) throw new Error('Code is required');
    if (!CODE_PATTERN.test(trimmedCode)) {
      throw new Error('Code may only contain letters, numbers, hyphens, and underscores');
    }

    const existing = await this.sessionRepo.findOneBy({ code: trimmedCode });
    if (existing) throw new Error('A session with that code already exists');

    const session = this.sessionRepo.create({ title: trimmedTitle, code: trimmedCode });
    return this.sessionRepo.save(session);
  }
}
