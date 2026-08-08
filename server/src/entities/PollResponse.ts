import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
} from 'typeorm';
import { ObjectType, Field, ID, Int } from 'type-graphql';
import { Poll } from './Poll';
import { PollOption } from './PollOption';

@Entity()
@ObjectType()
@Unique(['voterToken', 'poll'])
export class PollResponse {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id!: string;

  @Column('varchar')
  @Field(() => String)
  voterToken!: string;

  @ManyToOne(() => Poll, (poll) => poll.responses, { onDelete: 'CASCADE' })
  poll!: Poll;

  @ManyToOne(() => PollOption, { nullable: true, onDelete: 'CASCADE' })
  @Field(() => PollOption, { nullable: true })
  selectedOption!: PollOption | null;

  @Column('varchar', { nullable: true })
  @Field(() => String, { nullable: true })
  textValue!: string | null;

  @Column('int', { nullable: true })
  @Field(() => Int, { nullable: true })
  ratingValue!: number | null;

  @Column('simple-json', { nullable: true })
  @Field(() => [String], { nullable: true })
  rankingOrder!: string[] | null;
}
