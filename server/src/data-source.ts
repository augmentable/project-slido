import { DataSource } from 'typeorm';
import { Session } from './entities/Session';
import { Question } from './entities/Question';
import { Upvote } from './entities/Upvote';
import { Poll } from './entities/Poll';
import { PollOption } from './entities/PollOption';
import { PollResponse } from './entities/PollResponse';
import { Quiz } from './entities/Quiz';
import { QuizQuestion } from './entities/QuizQuestion';
import { QuizOption } from './entities/QuizOption';
import { QuizAnswer } from './entities/QuizAnswer';
import { Survey } from './entities/Survey';
import { SurveyQuestion } from './entities/SurveyQuestion';
import { SurveyOption } from './entities/SurveyOption';
import { SurveyResponse } from './entities/SurveyResponse';
import { SurveyAnswer } from './entities/SurveyAnswer';
import { User } from './entities/User';
import { Reply } from './entities/Reply';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: !IS_PRODUCTION,
  logging: !IS_PRODUCTION,
  entities: [
    Session,
    Question,
    Upvote,
    Poll,
    PollOption,
    PollResponse,
    Quiz,
    QuizQuestion,
    QuizOption,
    QuizAnswer,
    Survey,
    SurveyQuestion,
    SurveyOption,
    SurveyResponse,
    SurveyAnswer,
    User,
    Reply,
  ],
  migrations: [__dirname + '/migrations/*.ts'],
  subscribers: [],
});
