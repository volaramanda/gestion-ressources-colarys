// backend/src/entities/DetailPresence.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from "typeorm";
import { Presence } from "./Presence";

@Entity("detail_presence")
export class DetailPresence {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "signature_entree", type: "text" })
  signatureEntree!: string;

  @Column({ name: "signature_sortie", type: "text", nullable: true })
  signatureSortie!: string;

  @Column({ type: "text", nullable: true })
  observations!: string;

  @OneToOne(() => Presence, presence => presence.details)
  @JoinColumn({ name: "presence_id" })
  presence!: Presence;
}