import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  OneToMany 
} from "typeorm";
import { IsNotEmpty, Length } from "class-validator";
import { Agent } from "./Agent";

@Entity()
export class Role {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ 
    nullable: false, 
    length: 150,
    unique: true
  })
  @IsNotEmpty()
  @Length(2, 150)
  role!: string;

  @CreateDateColumn({ 
    type: 'timestamp',
    name: 'date_ajout'
  })
  dateajout!: Date;

  @UpdateDateColumn({ 
    type: 'timestamp',
    name: 'updated_at'
  })
  updatedAt!: Date;

  
  @OneToMany(() => Agent, (agent) => agent.campagne)
  agents!: Agent[];
}