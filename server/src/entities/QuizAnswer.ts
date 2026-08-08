import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
} from 'typeorm';
import { ObjectType, Field, ID, Int } from 'type-graphql';
import { QuizQuestion } from './QuizQuestion';
import { QuizOption } from './QuizOption';

@Entity()
@ObjectType()
@Unique(['voterToken', 'quizQuestion'])
export class QuizAnswer {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id!: string;

  @Column('varchar')
  @Field(() => String)
  voterToken!: string;

  @ManyToOne(() => QuizQuestion, (q) => q.answers, { onDelete: 'CASCADE' })
  quizQuestion!: QuizQuestion;

  @ManyToOne(() => QuizOption, { nullable: true, onDelete: 'CASCADE' })
  @Field(() => QuizOption, { nullable: true })
  selectedOption!: QuizOption | null;

  @Column('int', { default: 0 })
  @Field(() => Int)
  answeredInMs!: number;

  @Column('boolean', { default: false })
  @Field(() => Boolean)
  isCorrect!: boolean;

  @Column('int', { default: 0 })
  @Field(() => Int)
  score!: number;
}
