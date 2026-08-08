import { DataSource } from 'typeorm';
import { Session } from './entities/Session';
import { Question } from './entities/Question';
import { Upvote } from './entities/Upvote';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: !IS_PRODUCTION,
  logging: !IS_PRODUCTION,
  entities: [Session, Question, Upvote],
  migrations: [__dirname + '/migrations/*.ts'],
  subscribers: [],
});
