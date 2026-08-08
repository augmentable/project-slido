import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { ObjectType, Field, ID, Int } from 'type-graphql';
import { Poll } from './Poll';

@Entity()
@ObjectType()
export class PollOption {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id!: string;

  @Column('varchar')
  @Field(() => String)
  text!: string;

  @Column('int', { default: 0 })
  @Field(() => Int)
  position!: number;

  @ManyToOne(() => Poll, (poll) => poll.options, { onDelete: 'CASCADE' })
  poll!: Poll;

  @Field(() => Int)
  voteCount!: number;
}
