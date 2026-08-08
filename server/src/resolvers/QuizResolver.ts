import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Subscription,
  Root,
} from 'type-graphql';
import { ObjectType, Field, Int, ID } from 'type-graphql';
import { Quiz } from '../entities/Quiz';
import { QuizQuestion } from '../entities/QuizQuestion';
import { QuizOption } from '../entities/QuizOption';
import { QuizAnswer } from '../entities/QuizAnswer';
import { Session } from '../entities/Session';
import { AppDataSource } from '../data-source';
import { pubSub } from '../pubsub';

@ObjectType()
export class LeaderboardEntry {
  @Field(() => String)
  voterToken!: string;

  @Field(() => Int)
  totalScore!: number;

  @Field(() => Int)
  correctCount!: number;
}

@Resolver(() => Quiz)
export class QuizResolver {
  private quizRepo = AppDataSource.getRepository(Quiz);
  private questionRepo = AppDataSource.getRepository(QuizQuestion);
  private optionRepo = AppDataSource.getRepository(QuizOption);
  private answerRepo = AppDataSource.getRepository(QuizAnswer);
  private sessionRepo = AppDataSource.getRepository(Session);

  @Query(() => Quiz, { nullable: true })
  async quiz(@Arg('quizId', () => String) quizId: string): Promise<Quiz | null> {
    return this.quizRepo.findOne({
      where: { id: quizId },
      relations: { questions: { options: true } },
      order: { questions: { position: 'ASC' } },
    });
  }

  @Query(() => [LeaderboardEntry])
  async quizLeaderboard(
    @Arg('quizId', () => String) quizId: string,
  ): Promise<LeaderboardEntry[]> {
    const results = await this.answerRepo
      .createQueryBuilder('answer')
      .select('answer.voterToken', 'voterToken')
      .addSelect('SUM(answer.score)', 'totalScore')
      .addSelect('SUM(CASE WHEN answer.isCorrect THEN 1 ELSE 0 END)', 'correctCount')
      .innerJoin('answer.quizQuestion', 'qq')
      .innerJoin('qq.quiz', 'quiz')
      .where('quiz.id = :quizId', { quizId })
      .groupBy('answer.voterToken')
      .orderBy('"totalScore"', 'DESC')
      .getRawMany();

    return results.map((r) => ({
      voterToken: r.voterToken,
      totalScore: Number(r.totalScore),
      correctCount: Number(r.correctCount),
    }));
  }

  @Mutation(() => Quiz)
  async createQuiz(
    @Arg('sessionId', () => String) sessionId: string,
    @Arg('title', () => String) title: string,
  ): Promise<Quiz> {
    const session = await this.sessionRepo.findOneBy({ id: sessionId });
    if (!session) throw new Error('Session not found');

    const quiz = this.quizRepo.create({
      title: title.trim().slice(0, 200),
      session,
    });
    const saved = await this.quizRepo.save(quiz);
    saved.questions = [];
    return saved;
  }

  @Mutation(() => QuizQuestion)
  async addQuizQuestion(
    @Arg('quizId', () => String) quizId: string,
    @Arg('text', () => String) text: string,
    @Arg('options', () => [String]) optionTexts: string[],
    @Arg('correctOptionIndex', () => Number) correctOptionIndex: number,
    @Arg('timeLimit', () => Number, { nullable: true }) timeLimit?: number,
  ): Promise<QuizQuestion> {
    const quiz = await this.quizRepo.findOne({
      where: { id: quizId },
      relations: { questions: true },
    });
    if (!quiz) throw new Error('Quiz not found');

    const position = quiz.questions?.length ?? 0;
    const question = this.questionRepo.create({
      text: text.trim().slice(0, 500),
      timeLimit: timeLimit ?? 20,
      position,
      quiz,
    });
    const savedQuestion = await this.questionRepo.save(question);

    const options = optionTexts.map((t, i) =>
      this.optionRepo.create({
        text: t.trim().slice(0, 200),
        position: i,
        quizQuestion: savedQuestion,
      }),
    );
    const savedOptions = await this.optionRepo.save(options);
    savedQuestion.options = savedOptions;

    if (correctOptionIndex >= 0 && correctOptionIndex < savedOptions.length) {
      savedQuestion.correctOptionId = Number(savedOptions[correctOptionIndex].id);
      await this.questionRepo.save(savedQuestion);
    }

    return savedQuestion;
  }

  @Mutation(() => Quiz)
  async startQuiz(
    @Arg('quizId', () => String) quizId: string,
  ): Promise<Quiz> {
    const quiz = await this.quizRepo.findOne({
      where: { id: quizId },
      relations: { session: true, questions: { options: true } },
      order: { questions: { position: 'ASC' } },
    });
    if (!quiz) throw new Error('Quiz not found');
    if (!quiz.questions.length) throw new Error('Quiz has no questions');

    quiz.isActive = true;
    quiz.currentQuestionIndex = 0;
    const saved = await this.quizRepo.save(quiz);
    pubSub.publish('QUIZ_STATE_CHANGED', quiz.session.id, saved);
    return saved;
  }

  @Mutation(() => Quiz)
  async nextQuizQuestion(
    @Arg('quizId', () => String) quizId: string,
  ): Promise<Quiz> {
    const quiz = await this.quizRepo.findOne({
      where: { id: quizId },
      relations: { session: true, questions: { options: true } },
      order: { questions: { position: 'ASC' } },
    });
    if (!quiz) throw new Error('Quiz not found');

    const nextIndex = quiz.currentQuestionIndex + 1;
    if (nextIndex >= quiz.questions.length) {
      quiz.isActive = false;
      quiz.currentQuestionIndex = -1;
    } else {
      quiz.currentQuestionIndex = nextIndex;
    }

    const saved = await this.quizRepo.save(quiz);
    pubSub.publish('QUIZ_STATE_CHANGED', quiz.session.id, saved);
    return saved;
  }

  @Mutation(() => QuizAnswer)
  async submitQuizAnswer(
    @Arg('quizQuestionId', () => String) quizQuestionId: string,
    @Arg('selectedOptionId', () => String) selectedOptionId: string,
    @Arg('voterToken', () => String) voterToken: string,
    @Arg('answeredInMs', () => Number) answeredInMs: number,
  ): Promise<QuizAnswer> {
    const quizQuestion = await this.questionRepo.findOne({
      where: { id: quizQuestionId },
      relations: { quiz: { session: true } },
    });
    if (!quizQuestion) throw new Error('Quiz question not found');

    const existing = await this.answerRepo.findOne({
      where: { quizQuestion: { id: quizQuestionId }, voterToken },
    });
    if (existing) throw new Error('Already answered this question');

    const selectedOption = await this.optionRepo.findOneBy({ id: selectedOptionId });
    if (!selectedOption) throw new Error('Option not found');

    const isCorrect = Number(selectedOptionId) === quizQuestion.correctOptionId;
    const timeLimitMs = quizQuestion.timeLimit * 1000;
    const score = isCorrect
      ? Math.max(100, Math.round(1000 - (answeredInMs / timeLimitMs) * 900))
      : 0;

    const answer = this.answerRepo.create({
      quizQuestion,
      selectedOption,
      voterToken,
      answeredInMs,
      isCorrect,
      score,
    });

    return this.answerRepo.save(answer);
  }

  @Subscription(() => Quiz, {
    topics: 'QUIZ_STATE_CHANGED',
    topicId: ({ args }) => args.sessionId,
  })
  quizStateChanged(
    @Root() quizPayload: Quiz,
    @Arg('sessionId', () => String) sessionId: string,
  ): Quiz {
    return quizPayload;
  }
}
