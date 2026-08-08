import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { ObjectType, Field, ID, Int } from 'type-graphql';
import { Session } from './Session';
import { QuizQuestion } from './QuizQuestion';

@Entity()
@ObjectType()
export class Quiz {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id!: string;

  @Column('varchar')
  @Field(() => String)
  title!: string;

  @Column('boolean', { default: false })
  @Field(() => Boolean)
  isActive!: boolean;

  @Column('int', { default: -1 })
  @Field(() => Int)
  currentQuestionIndex!: number;

  @ManyToOne(() => Session, (session) => session.quizzes, { onDelete: 'CASCADE' })
  session!: Session;

  @OneToMany(() => QuizQuestion, (q) => q.quiz, { cascade: true })
  @Field(() => [QuizQuestion])
  questions!: QuizQuestion[];

  @CreateDateColumn()
  @Field(() => String)
  createdAt!: Date;
}
