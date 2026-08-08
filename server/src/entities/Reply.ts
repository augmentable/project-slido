import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { ObjectType, Field, ID } from 'type-graphql';
import { Question } from './Question';

@Entity()
@ObjectType()
export class Reply {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id!: string;

  @Column('varchar')
  @Field(() => String)
  text!: string;

  @Column('varchar')
  @Field(() => String)
  authorName!: string;

  @ManyToOne(() => Question, (question) => question.replies, { onDelete: 'CASCADE' })
  question!: Question;

  @CreateDateColumn()
  @Field(() => String)
  createdAt!: Date;
}
