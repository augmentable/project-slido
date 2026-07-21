import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
} from 'typeorm';
import { ObjectType, Field, ID } from 'type-graphql';
import { Question } from './Question';

@Entity()
@ObjectType()
@Unique(['voterToken', 'question']) // 👈 1 upvote per user per question
export class Upvote {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id!: string;

  @Column('varchar')
  @Field(() => String)
  voterToken!: string;

  @ManyToOne(() => Question, (question) => question.upvotes, {
    onDelete: 'CASCADE',
  })
  question!: Question;
}
