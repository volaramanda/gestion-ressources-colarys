/*
    HERINANTENAINA Anthony
    11-07-2025 14:18
    Tel: 034 85 178 51
*/
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, JoinColumn, ManyToOne } from "typeorm";
import { DetailPresence } from "./DetailPresence";

@Entity()
export class Trashpresence {
    @PrimaryGeneratedColumn()
    id!: number; // Utilisation de l'assertion de définition définie (!)

    @ManyToOne(() => DetailPresence, { eager: true }) // Option eager pour le chargement automatique
    @JoinColumn({ name: "iddetail" })
    detailpresence!: DetailPresence; // Assertion de définition définie

    @Column({ nullable: false, type: "timestamp" })
    entree!: Date; // Assertion pour les champs obligatoires

    @Column({ nullable: false, type: "timestamp" })
    sortie!: Date;

    @CreateDateColumn({ type: 'timestamp' })
    dateajout!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;

    // Constructeur pour l'initialisation
    constructor() {
        this.entree = new Date();
        this.sortie = new Date();
        // Les champs @CreateDateColumn et @UpdateDateColumn seront gérés automatiquement
    }
}