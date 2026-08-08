import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { ObjectType, Field, ID } from 'type-graphql';
import { Session } from './Session';
import { SurveyQuestion } from './SurveyQuestion';
import { SurveyResponse } from './SurveyResponse';

@Entity()
@ObjectType()
export class Survey {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id!: string;

  @Column('varchar')
  @Field(() => String)
  title!: string;

  @Column('boolean', { default: true })
  @Field(() => Boolean)
  isOpen!: boolean;

  @ManyToOne(() => Session, (session) => session.surveys, { onDelete: 'CASCADE' })
  session!: Session;

  @OneToMany(() => SurveyQuestion, (q) => q.survey, { cascade: true })
  @Field(() => [SurveyQuestion])
  questions!: SurveyQuestion[];

  @OneToMany(() => SurveyResponse, (r) => r.survey)
  responses!: SurveyResponse[];

  @Field(() => Number)
  responseCount!: number;

  @CreateDateColumn()
  @Field(() => String)
  createdAt!: Date;
}
