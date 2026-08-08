import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { ObjectType, Field, ID, Int } from 'type-graphql';
import { SurveyResponse } from './SurveyResponse';
import { SurveyQuestion } from './SurveyQuestion';
import { SurveyOption } from './SurveyOption';

@Entity()
@ObjectType()
export class SurveyAnswer {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id!: string;

  @ManyToOne(() => SurveyResponse, (r) => r.answers, { onDelete: 'CASCADE' })
  surveyResponse!: SurveyResponse;

  @ManyToOne(() => SurveyQuestion, { onDelete: 'CASCADE' })
  @Field(() => SurveyQuestion)
  surveyQuestion!: SurveyQuestion;

  @ManyToOne(() => SurveyOption, { nullable: true, onDelete: 'CASCADE' })
  @Field(() => SurveyOption, { nullable: true })
  selectedOption!: SurveyOption | null;

  @Column('varchar', { nullable: true })
  @Field(() => String, { nullable: true })
  textValue!: string | null;

  @Column('int', { nullable: true })
  @Field(() => Int, { nullable: true })
  ratingValue!: number | null;
}
