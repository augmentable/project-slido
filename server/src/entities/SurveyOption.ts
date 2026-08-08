import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { ObjectType, Field, ID, Int } from 'type-graphql';
import { SurveyQuestion } from './SurveyQuestion';

@Entity()
@ObjectType()
export class SurveyOption {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id!: string;

  @Column('varchar')
  @Field(() => String)
  text!: string;

  @Column('int', { default: 0 })
  @Field(() => Int)
  position!: number;

  @ManyToOne(() => SurveyQuestion, (q) => q.options, { onDelete: 'CASCADE' })
  surveyQuestion!: SurveyQuestion;
}
