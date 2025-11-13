// backend/src/entities/Presence.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, JoinColumn } from "typeorm";
import { Agent } from "./Agent";
import { DetailPresence } from "./DetailPresence";

@Entity("presence")
export class Presence {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Agent, agent => agent.presences)
  @JoinColumn({ name: "agent_id" })
  agent!: Agent;

  @Column({ type: "date", default: () => "CURRENT_DATE" })
  date!: string;

  @Column({ name: "heure_entree", type: "time" })
  heureEntree!: string;

  @Column({ name: "heure_sortie", type: "time", nullable: true })
  heureSortie!: string | null;

  @Column({ default: "JOUR" })
  shift!: string;

  @Column({ name: "heures_travaillees", type: "decimal", precision: 5, scale: 2, nullable: true })
  heuresTravaillees!: number | null;

  @OneToOne(() => DetailPresence, detail => detail.presence)
  details!: DetailPresence;

  @Column({ name: "created_at", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;
}