import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { ObjectType, Field, ID } from 'type-graphql';
import { Question } from './Question';
import { Poll } from './Poll';
import { Quiz } from './Quiz';
import { Survey } from './Survey';

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

  @Column('boolean', { default: false })
  @Field(() => Boolean)
  isModerated!: boolean;

  @Column('varchar', { nullable: true })
  passcodeHash!: string | null;

  @Field(() => Boolean)
  get isPasswordProtected(): boolean {
    return !!this.passcodeHash;
  }

  @Column('varchar', { nullable: true })
  @Field(() => String, { nullable: true })
  primaryColor!: string | null;

  @Column('varchar', { nullable: true })
  @Field(() => String, { nullable: true })
  logoUrl!: string | null;

  @OneToMany(() => Question, (question) => question.session)
  @Field(() => [Question])
  questions!: Question[];

  @OneToMany(() => Poll, (poll) => poll.session)
  @Field(() => [Poll])
  polls!: Poll[];

  @OneToMany(() => Quiz, (quiz) => quiz.session)
  @Field(() => [Quiz])
  quizzes!: Quiz[];

  @OneToMany(() => Survey, (survey) => survey.session)
  @Field(() => [Survey])
  surveys!: Survey[];

  @CreateDateColumn()
  @Field(() => String)
  createdAt!: Date;
}
