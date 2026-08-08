import {
  Resolver,
  Query,
  Mutation,
  Arg,
  FieldResolver,
  Root,
  InputType,
  Field as GqlField,
  Int,
} from 'type-graphql';
import { Survey } from '../entities/Survey';
import { SurveyQuestion, SurveyQuestionType } from '../entities/SurveyQuestion';
import { SurveyOption } from '../entities/SurveyOption';
import { SurveyResponse } from '../entities/SurveyResponse';
import { SurveyAnswer } from '../entities/SurveyAnswer';
import { Session } from '../entities/Session';
import { AppDataSource } from '../data-source';

@InputType()
class SurveyAnswerInput {
  @GqlField(() => String)
  surveyQuestionId!: string;

  @GqlField(() => String, { nullable: true })
  selectedOptionId?: string;

  @GqlField(() => String, { nullable: true })
  textValue?: string;

  @GqlField(() => Int, { nullable: true })
  ratingValue?: number;
}

@Resolver(() => Survey)
export class SurveyResolver {
  private surveyRepo = AppDataSource.getRepository(Survey);
  private questionRepo = AppDataSource.getRepository(SurveyQuestion);
  private optionRepo = AppDataSource.getRepository(SurveyOption);
  private responseRepo = AppDataSource.getRepository(SurveyResponse);
  private answerRepo = AppDataSource.getRepository(SurveyAnswer);
  private sessionRepo = AppDataSource.getRepository(Session);

  @FieldResolver(() => Number)
  async responseCount(@Root() survey: Survey): Promise<number> {
    return this.responseRepo.count({ where: { survey: { id: survey.id } } });
  }

  @Query(() => Survey, { nullable: true })
  async survey(@Arg('surveyId', () => String) surveyId: string): Promise<Survey | null> {
    return this.surveyRepo.findOne({
      where: { id: surveyId },
      relations: { questions: { options: true } },
      order: { questions: { position: 'ASC' } },
    });
  }

  @Mutation(() => Survey)
  async createSurvey(
    @Arg('sessionId', () => String) sessionId: string,
    @Arg('title', () => String) title: string,
  ): Promise<Survey> {
    const session = await this.sessionRepo.findOneBy({ id: sessionId });
    if (!session) throw new Error('Session not found');

    const survey = this.surveyRepo.create({
      title: title.trim().slice(0, 200),
      session,
    });
    const saved = await this.surveyRepo.save(survey);
    saved.questions = [];
    return saved;
  }

  @Mutation(() => SurveyQuestion)
  async addSurveyQuestion(
    @Arg('surveyId', () => String) surveyId: string,
    @Arg('type', () => SurveyQuestionType) type: SurveyQuestionType,
    @Arg('text', () => String) text: string,
    @Arg('options', () => [String], { nullable: true }) optionTexts?: string[],
    @Arg('isRequired', () => Boolean, { nullable: true }) isRequired?: boolean,
  ): Promise<SurveyQuestion> {
    const survey = await this.surveyRepo.findOne({
      where: { id: surveyId },
      relations: { questions: true },
    });
    if (!survey) throw new Error('Survey not found');

    const position = survey.questions?.length ?? 0;
    const question = this.questionRepo.create({
      type,
      text: text.trim().slice(0, 500),
      position,
      isRequired: isRequired ?? false,
      survey,
    });
    const savedQuestion = await this.questionRepo.save(question);

    if (optionTexts?.length && type === SurveyQuestionType.MULTIPLE_CHOICE) {
      const options = optionTexts.map((t, i) =>
        this.optionRepo.create({
          text: t.trim().slice(0, 200),
          position: i,
          surveyQuestion: savedQuestion,
        }),
      );
      savedQuestion.options = await this.optionRepo.save(options);
    } else {
      savedQuestion.options = [];
    }

    return savedQuestion;
  }

  @Mutation(() => SurveyResponse)
  async submitSurveyResponse(
    @Arg('surveyId', () => String) surveyId: string,
    @Arg('voterToken', () => String) voterToken: string,
    @Arg('answers', () => [SurveyAnswerInput]) answerInputs: SurveyAnswerInput[],
  ): Promise<SurveyResponse> {
    const survey = await this.surveyRepo.findOne({
      where: { id: surveyId },
      relations: { questions: true },
    });
    if (!survey) throw new Error('Survey not found');
    if (!survey.isOpen) throw new Error('Survey is closed');

    const existing = await this.responseRepo.findOne({
      where: { survey: { id: surveyId }, voterToken },
    });
    if (existing) throw new Error('Already submitted a response');

    const response = this.responseRepo.create({ survey, voterToken });
    const savedResponse = await this.responseRepo.save(response);

    const answers: SurveyAnswer[] = [];
    for (const input of answerInputs) {
      const surveyQuestion = await this.questionRepo.findOneBy({ id: input.surveyQuestionId });
      if (!surveyQuestion) continue;

      let selectedOption = null;
      if (input.selectedOptionId) {
        selectedOption = await this.optionRepo.findOneBy({ id: input.selectedOptionId });
      }

      answers.push(
        this.answerRepo.create({
          surveyResponse: savedResponse,
          surveyQuestion,
          selectedOption,
          textValue: input.textValue?.trim().slice(0, 2000) || null,
          ratingValue: input.ratingValue != null ? Math.min(Math.max(input.ratingValue, 1), 5) : null,
        }),
      );
    }

    savedResponse.answers = await this.answerRepo.save(answers);
    return savedResponse;
  }

  @Mutation(() => Survey)
  async closeSurvey(
    @Arg('surveyId', () => String) surveyId: string,
  ): Promise<Survey> {
    const survey = await this.surveyRepo.findOneBy({ id: surveyId });
    if (!survey) throw new Error('Survey not found');
    survey.isOpen = false;
    return this.surveyRepo.save(survey);
  }
}
