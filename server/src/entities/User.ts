import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { ObjectType, Field, ID } from 'type-graphql';
import { Session } from './Session';

@Entity()
@ObjectType()
export class User {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id!: string;

  @Column('varchar', { unique: true })
  @Field(() => String)
  email!: string;

  @Column('varchar')
  passwordHash!: string;

  @Column('varchar')
  @Field(() => String)
  displayName!: string;

  @OneToMany(() => Session, (session) => session.owner)
  sessions!: Session[];

  @CreateDateColumn()
  @Field(() => String)
  createdAt!: Date;
}
