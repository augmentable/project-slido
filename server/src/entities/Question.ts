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
import { Reply } from './Reply';

@Entity()
@ObjectType()
export class Question {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id!: string;

  @Column('varchar')
  @Field(() => String)
  text!: string;

  @Column('varchar', { nullable: true })
  @Field(() => String, { nullable: true })
  authorName!: string | null;

  @Column('boolean', { default: true })
  @Field(() => Boolean)
  isApproved!: boolean;

  @Column('boolean', { default: false })
  @Field(() => Boolean)
  isHighlighted!: boolean;

  @Column('boolean', { default: false })
  @Field(() => Boolean)
  isAnswered!: boolean;

  @ManyToOne(() => Session, (session) => session.questions, {
    onDelete: 'CASCADE',
  })
  session!: Session;

  @OneToMany(() => Upvote, (upvote) => upvote.question)
  upvotes!: Upvote[];

  @OneToMany(() => Reply, (reply) => reply.question, { cascade: true })
  @Field(() => [Reply])
  replies!: Reply[];

  @Field(() => Int)
  upvoteCount!: number;

  @CreateDateColumn()
  @Field(() => String)
  createdAt!: Date;
}
