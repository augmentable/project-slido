import { Resolver, Query, Arg, ObjectType, Field, Int, Float } from 'type-graphql';
import { AppDataSource } from '../data-source';
import { Question } from '../entities/Question';
import { Upvote } from '../entities/Upvote';
import { PollResponse } from '../entities/PollResponse';
import { Poll } from '../entities/Poll';
import { QuizAnswer } from '../entities/QuizAnswer';
import { Quiz } from '../entities/Quiz';
import { SurveyResponse } from '../entities/SurveyResponse';
import { Survey } from '../entities/Survey';

@ObjectType()
class SessionAnalytics {
  @Field(() => Int)
  totalParticipants!: number;

  @Field(() => Int)
  totalQuestions!: number;

  @Field(() => Int)
  totalUpvotes!: number;

  @Field(() => Int)
  totalPolls!: number;

  @Field(() => Int)
  totalPollResponses!: number;

  @Field(() => Int)
  totalQuizzes!: number;

  @Field(() => Float)
  quizAverageScore!: number;

  @Field(() => Int)
  totalSurveys!: number;

  @Field(() => Int)
  totalSurveyResponses!: number;
}

@Resolver()
export class AnalyticsResolver {
  @Query(() => SessionAnalytics)
  async sessionAnalytics(
    @Arg('sessionId', () => String) sessionId: string,
  ): Promise<SessionAnalytics> {
    const questionRepo = AppDataSource.getRepository(Question);
    const upvoteRepo = AppDataSource.getRepository(Upvote);
    const pollRepo = AppDataSource.getRepository(Poll);
    const pollResponseRepo = AppDataSource.getRepository(PollResponse);
    const quizRepo = AppDataSource.getRepository(Quiz);
    const quizAnswerRepo = AppDataSource.getRepository(QuizAnswer);
    const surveyRepo = AppDataSource.getRepository(Survey);
    const surveyResponseRepo = AppDataSource.getRepository(SurveyResponse);

    const totalQuestions = await questionRepo.count({
      where: { session: { id: sessionId } },
    });

    const totalUpvotes = await upvoteRepo
      .createQueryBuilder('upvote')
      .innerJoin('upvote.question', 'question')
      .where('question.sessionId = :sessionId', { sessionId })
      .getCount();

    const totalPolls = await pollRepo.count({
      where: { session: { id: sessionId } },
    });

    const totalPollResponses = await pollResponseRepo
      .createQueryBuilder('pr')
      .innerJoin('pr.poll', 'poll')
      .where('poll.sessionId = :sessionId', { sessionId })
      .getCount();

    const totalQuizzes = await quizRepo.count({
      where: { session: { id: sessionId } },
    });

    const avgScoreResult = await quizAnswerRepo
      .createQueryBuilder('answer')
      .select('AVG(answer.score)', 'avg')
      .innerJoin('answer.quizQuestion', 'qq')
      .innerJoin('qq.quiz', 'quiz')
      .where('quiz.sessionId = :sessionId', { sessionId })
      .getRawOne();

    const totalSurveys = await surveyRepo.count({
      where: { session: { id: sessionId } },
    });

    const totalSurveyResponses = await surveyResponseRepo
      .createQueryBuilder('sr')
      .innerJoin('sr.survey', 'survey')
      .where('survey.sessionId = :sessionId', { sessionId })
      .getCount();

    // Count distinct voter tokens across all interaction types
    const voterTokenSets = new Set<string>();

    const upvoteTokens = await upvoteRepo
      .createQueryBuilder('upvote')
      .select('DISTINCT upvote.voterToken', 'token')
      .innerJoin('upvote.question', 'question')
      .where('question.sessionId = :sessionId', { sessionId })
      .getRawMany();
    upvoteTokens.forEach((r) => voterTokenSets.add(r.token));

    const pollTokens = await pollResponseRepo
      .createQueryBuilder('pr')
      .select('DISTINCT pr.voterToken', 'token')
      .innerJoin('pr.poll', 'poll')
      .where('poll.sessionId = :sessionId', { sessionId })
      .getRawMany();
    pollTokens.forEach((r) => voterTokenSets.add(r.token));

    const quizTokens = await quizAnswerRepo
      .createQueryBuilder('answer')
      .select('DISTINCT answer.voterToken', 'token')
      .innerJoin('answer.quizQuestion', 'qq')
      .innerJoin('qq.quiz', 'quiz')
      .where('quiz.sessionId = :sessionId', { sessionId })
      .getRawMany();
    quizTokens.forEach((r) => voterTokenSets.add(r.token));

    const surveyTokens = await surveyResponseRepo
      .createQueryBuilder('sr')
      .select('DISTINCT sr.voterToken', 'token')
      .innerJoin('sr.survey', 'survey')
      .where('survey.sessionId = :sessionId', { sessionId })
      .getRawMany();
    surveyTokens.forEach((r) => voterTokenSets.add(r.token));

    return {
      totalParticipants: voterTokenSets.size,
      totalQuestions,
      totalUpvotes,
      totalPolls,
      totalPollResponses,
      totalQuizzes,
      quizAverageScore: Number(avgScoreResult?.avg) || 0,
      totalSurveys,
      totalSurveyResponses,
    };
  }
}
