import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { ObjectType, Field, ID, Int } from 'type-graphql';
import { Quiz } from './Quiz';
import { QuizOption } from './QuizOption';
import { QuizAnswer } from './QuizAnswer';

@Entity()
@ObjectType()
export class QuizQuestion {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id!: string;

  @Column('varchar')
  @Field(() => String)
  text!: string;

  @Column('int', { default: 20 })
  @Field(() => Int)
  timeLimit!: number;

  @Column('int', { default: 0 })
  @Field(() => Int)
  position!: number;

  @Column('int', { nullable: true })
  @Field(() => Int, { nullable: true })
  correctOptionId!: number | null;

  @ManyToOne(() => Quiz, (quiz) => quiz.questions, { onDelete: 'CASCADE' })
  quiz!: Quiz;

  @OneToMany(() => QuizOption, (option) => option.quizQuestion, { cascade: true })
  @Field(() => [QuizOption])
  options!: QuizOption[];

  @OneToMany(() => QuizAnswer, (answer) => answer.quizQuestion)
  answers!: QuizAnswer[];
}
