import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { ObjectType, Field, ID } from 'type-graphql';
import { Question } from './Question';

@Entity()
@ObjectType()
export class Session {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id!: string;

  @Column('varchar', { unique: true })
  @Field(() => String)
  code!: string;

  @Column('varchar')
  @Field(() => String)
  title!: string;

  @OneToMany(() => Question, (question) => question.session)
  @Field(() => [Question])
  questions!: Question[];

  @CreateDateColumn()
  @Field(() => String)
  createdAt!: Date;
}
