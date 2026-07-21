import { Resolver, Query, Mutation, Arg } from 'type-graphql';
import { Session } from '../entities/Session';
import { AppDataSource } from '../data-source';

@Resolver(() => Session)
export class SessionResolver {
  private sessionRepo = AppDataSource.getRepository(Session);

  // QUERY: Fetch a session by its code (e.g. "TECHTALK")
  @Query(() => Session, { nullable: true })
  async session(
    @Arg('code', () => String) code: string,
  ): Promise<Session | null> {
    return this.sessionRepo.findOne({
      where: { code },
      relations: {
        questions: true,
      },
    });
  }

  // MUTATION: Create a new session
  @Mutation(() => Session)
  async createSession(
    @Arg('title', () => String) title: string,
    @Arg('code', () => String) code: string,
  ): Promise<Session> {
    const session = this.sessionRepo.create({ title, code });
    return this.sessionRepo.save(session);
  }
}
