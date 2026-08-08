import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { ObjectType, Field, ID, registerEnumType } from 'type-graphql';
import { Session } from './Session';
import { PollOption } from './PollOption';
import { PollResponse } from './PollResponse';

export enum PollType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  WORD_CLOUD = 'WORD_CLOUD',
  RATING = 'RATING',
  OPEN_TEXT = 'OPEN_TEXT',
  RANKING = 'RANKING',
}

registerEnumType(PollType, { name: 'PollType' });

@Entity()
@ObjectType()
export class Poll {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id!: string;

  @Column({ type: 'varchar' })
  @Field(() => PollType)
  type!: PollType;

  @Column('varchar')
  @Field(() => String)
  question!: string;

  @Column('boolean', { default: false })
  @Field(() => Boolean)
  isActive!: boolean;

  @Column('boolean', { default: false })
  @Field(() => Boolean)
  allowMultiple!: boolean;

  @ManyToOne(() => Session, (session) => session.polls, { onDelete: 'CASCADE' })
  session!: Session;

  @OneToMany(() => PollOption, (option) => option.poll, { cascade: true })
  @Field(() => [PollOption])
  options!: PollOption[];

  @OneToMany(() => PollResponse, (response) => response.poll)
  responses!: PollResponse[];

  @Field(() => Number)
  responseCount!: number;

  @CreateDateColumn()
  @Field(() => String)
  createdAt!: Date;
}
