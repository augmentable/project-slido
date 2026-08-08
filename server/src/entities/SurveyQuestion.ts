import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { ObjectType, Field, ID, Int, registerEnumType } from 'type-graphql';
import { Survey } from './Survey';
import { SurveyOption } from './SurveyOption';

export enum SurveyQuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  OPEN_TEXT = 'OPEN_TEXT',
  RATING = 'RATING',
}

registerEnumType(SurveyQuestionType, { name: 'SurveyQuestionType' });

@Entity()
@ObjectType()
export class SurveyQuestion {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id!: string;

  @Column({ type: 'varchar' })
  @Field(() => SurveyQuestionType)
  type!: SurveyQuestionType;

  @Column('varchar')
  @Field(() => String)
  text!: string;

  @Column('int', { default: 0 })
  @Field(() => Int)
  position!: number;

  @Column('boolean', { default: false })
  @Field(() => Boolean)
  isRequired!: boolean;

  @ManyToOne(() => Survey, (survey) => survey.questions, { onDelete: 'CASCADE' })
  survey!: Survey;

  @OneToMany(() => SurveyOption, (option) => option.surveyQuestion, { cascade: true })
  @Field(() => [SurveyOption])
  options!: SurveyOption[];
}
