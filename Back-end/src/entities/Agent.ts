// backend/src/entities/Agent.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Presence } from "./Presence";

@Entity("agent")
export class Agent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", unique: true, nullable: true })
  matricule!: string | null; // IMPORTANT: Permettre null

  @Column({ type: "varchar" })
  nom!: string;

  @Column({ type: "varchar" })
  prenom!: string;

  @Column({ type: "varchar", default: "Standard" })
  campagne!: string;

  @Column({ type: "text", nullable: true })
  signature!: string;

  @Column({ name: "date_creation", default: () => "CURRENT_TIMESTAMP" })
  dateCreation!: Date;

  @OneToMany(() => Presence, presence => presence.agent)
  presences!: Presence[];
}