
import { Entity, PrimaryGeneratedColumn, Column,JoinColumn, CreateDateColumn,ManyToOne,UpdateDateColumn} from "typeorm";
import { Agent } from "./Agent";
import { Role } from "./Role";

@Entity()
export class HistoAgents {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => Agent)
    @JoinColumn({ name: "idagent" })
    agent!: Agent;

    @ManyToOne(() => Role)
    @JoinColumn({ name: "ancienrole" })
    role!: Role;

    @CreateDateColumn({ type: 'timestamp' })
    dateajout!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}
