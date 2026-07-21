import { DataSource } from 'typeorm';
import { Session } from './entities/Session';
import { Question } from './entities/Question';
import { Upvote } from './entities/Upvote';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: true, // 👈 Disabled to prevent auto-syncing
  logging: true,
  entities: [Session, Question, Upvote],
  migrations: [__dirname + 'src/migrations/*.ts'], // 👈 Where generated migrations live
  subscribers: [],
});
