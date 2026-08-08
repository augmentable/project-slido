import { Resolver, Query, Mutation, Arg } from 'type-graphql';
import { Session } from '../entities/Session';
import { Question } from '../entities/Question';
import { User } from '../entities/User';
import { AppDataSource } from '../data-source';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'slido-clone-dev-secret';

const MAX_TITLE_LENGTH = 200;
const MAX_CODE_LENGTH = 32;
const CODE_PATTERN = /^[A-Z0-9_-]+$/;

function hashPasscode(passcode: string): string {
  return crypto.createHash('sha256').update(passcode).digest('hex');
}

@Resolver(() => Session)
export class SessionResolver {
  private sessionRepo = AppDataSource.getRepository(Session);
  private questionRepo = AppDataSource.getRepository(Question);
  private userRepo = AppDataSource.getRepository(User);

  @Query(() => Session, { nullable: true })
  async session(
    @Arg('code', () => String) code: string,
    @Arg('passcode', () => String, { nullable: true }) passcode?: string,
  ): Promise<Session | null> {
    const sanitized = code.trim().toUpperCase().slice(0, MAX_CODE_LENGTH);
    if (!CODE_PATTERN.test(sanitized)) return null;

    const session = await this.sessionRepo.findOne({
      where: { code: sanitized },
      relations: {
        owner: true,
        questions: { replies: true },
        polls: { options: true },
        quizzes: { questions: { options: true } },
        surveys: { questions: { options: true } },
      },
    });

    if (!session) return null;

    if (session.passcodeHash) {
      if (!passcode || hashPasscode(passcode) !== session.passcodeHash) {
        return null;
      }
    }

    if (session.isModerated && session.questions) {
      session.questions = session.questions.filter((q) => q.isApproved);
    }

    return session;
  }

  @Query(() => [Question])
  async pendingQuestions(
    @Arg('sessionId', () => String) sessionId: string,
  ): Promise<Question[]> {
    return this.questionRepo.find({
      where: { session: { id: sessionId }, isApproved: false },
      order: { createdAt: 'DESC' },
    });
  }

  @Mutation(() => Session)
  async createSession(
    @Arg('title', () => String) title: string,
    @Arg('code', () => String) code: string,
    @Arg('isModerated', () => Boolean, { nullable: true }) isModerated?: boolean,
    @Arg('passcode', () => String, { nullable: true }) passcode?: string,
    @Arg('authToken', () => String, { nullable: true }) authToken?: string,
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

    let owner: User | null = null;
    if (authToken) {
      try {
        const payload = jwt.verify(authToken, JWT_SECRET) as { userId: string };
        owner = await this.userRepo.findOneBy({ id: payload.userId });
      } catch { /* no owner */ }
    }

    const session = this.sessionRepo.create({
      title: trimmedTitle,
      code: trimmedCode,
      isModerated: isModerated ?? false,
      passcodeHash: passcode ? hashPasscode(passcode) : null,
      owner,
    });
    return this.sessionRepo.save(session);
  }

  @Mutation(() => Session)
  async updateSessionBranding(
    @Arg('sessionId', () => String) sessionId: string,
    @Arg('primaryColor', () => String, { nullable: true }) primaryColor?: string,
    @Arg('logoUrl', () => String, { nullable: true }) logoUrl?: string,
  ): Promise<Session> {
    const session = await this.sessionRepo.findOneBy({ id: sessionId });
    if (!session) throw new Error('Session not found');

    if (primaryColor !== undefined) session.primaryColor = primaryColor;
    if (logoUrl !== undefined) session.logoUrl = logoUrl;

    return this.sessionRepo.save(session);
  }
}
