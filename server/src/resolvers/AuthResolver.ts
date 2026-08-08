import { Resolver, Query, Mutation, Arg, ObjectType, Field } from 'type-graphql';
import { User } from '../entities/User';
import { AppDataSource } from '../data-source';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'slido-clone-dev-secret';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

@ObjectType()
class AuthPayload {
  @Field(() => String)
  token!: string;

  @Field(() => User)
  user!: User;
}

@Resolver()
export class AuthResolver {
  private userRepo = AppDataSource.getRepository(User);

  @Query(() => User, { nullable: true })
  async me(@Arg('token', () => String) token: string): Promise<User | null> {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
      return this.userRepo.findOneBy({ id: payload.userId });
    } catch {
      return null;
    }
  }

  @Mutation(() => AuthPayload)
  async register(
    @Arg('email', () => String) email: string,
    @Arg('password', () => String) password: string,
    @Arg('displayName', () => String) displayName: string,
  ): Promise<AuthPayload> {
    const trimmedEmail = email.trim().toLowerCase().slice(0, 255);
    const trimmedName = displayName.trim().slice(0, 100);

    if (!trimmedEmail || !password || !trimmedName) {
      throw new Error('All fields are required');
    }

    const existing = await this.userRepo.findOneBy({ email: trimmedEmail });
    if (existing) throw new Error('Email already registered');

    const user = this.userRepo.create({
      email: trimmedEmail,
      passwordHash: hashPassword(password),
      displayName: trimmedName,
    });
    const saved = await this.userRepo.save(user);

    const token = jwt.sign({ userId: saved.id }, JWT_SECRET, { expiresIn: '7d' });
    return { token, user: saved };
  }

  @Mutation(() => AuthPayload)
  async login(
    @Arg('email', () => String) email: string,
    @Arg('password', () => String) password: string,
  ): Promise<AuthPayload> {
    const user = await this.userRepo.findOneBy({ email: email.trim().toLowerCase() });
    if (!user || user.passwordHash !== hashPassword(password)) {
      throw new Error('Invalid email or password');
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    return { token, user };
  }
}
