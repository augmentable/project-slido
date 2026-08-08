import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { ObjectType, Field, ID, Int } from 'type-graphql';
import { QuizQuestion } from './QuizQuestion';

@Entity()
@ObjectType()
export class QuizOption {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id!: string;

  @Column('varchar')
  @Field(() => String)
  text!: string;

  @Column('int', { default: 0 })
  @Field(() => Int)
  position!: number;

  @ManyToOne(() => QuizQuestion, (q) => q.options, { onDelete: 'CASCADE' })
  quizQuestion!: QuizQuestion;
}
