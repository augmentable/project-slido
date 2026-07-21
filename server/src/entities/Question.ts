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
import { Upvote } from './Upvote';

@Entity()
@ObjectType()
export class Question {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id!: string;

  @Column('varchar')
  @Field(() => String)
  text!: string;

  @ManyToOne(() => Session, (session) => session.questions, {
    onDelete: 'CASCADE',
  })
  session!: Session;

  @OneToMany(() => Upvote, (upvote) => upvote.question)
  upvotes!: Upvote[];

  // Field Resolver computed property (not stored as a static column in DB)
  @Field(() => Int)
  upvoteCount!: number;

  @CreateDateColumn()
  @Field(() => String)
  createdAt!: Date;
}
