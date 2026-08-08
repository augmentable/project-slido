import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm';
import { ObjectType, Field, ID } from 'type-graphql';
import { Survey } from './Survey';
import { SurveyAnswer } from './SurveyAnswer';

@Entity()
@ObjectType()
@Unique(['voterToken', 'survey'])
export class SurveyResponse {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id!: string;

  @Column('varchar')
  @Field(() => String)
  voterToken!: string;

  @ManyToOne(() => Survey, (survey) => survey.responses, { onDelete: 'CASCADE' })
  survey!: Survey;

  @OneToMany(() => SurveyAnswer, (a) => a.surveyResponse, { cascade: true })
  @Field(() => [SurveyAnswer])
  answers!: SurveyAnswer[];

  @CreateDateColumn()
  @Field(() => String)
  submittedAt!: Date;
}
