import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Plateforme {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  nom!: string;

  @Column({ nullable: true })
  description!: string;
}