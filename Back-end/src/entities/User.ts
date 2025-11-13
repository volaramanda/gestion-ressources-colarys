import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  BeforeInsert,
  CreateDateColumn,
  UpdateDateColumn 
} from "typeorm";
import bcrypt from "bcryptjs";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number = 0;

  @Column()
  name: string = "";

  @Column({ unique: true })
  email: string = "";

  @Column()
  password: string = "";

  @Column({ nullable: true, default: "agent" })
  role: string = "agent";

  // Ajouter le mapping explicit pour les colonnes
 @CreateDateColumn({ type: 'timestamp' })
createdAt: Date = new Date();

  @UpdateDateColumn({ type: 'timestamp' })
updatedAt: Date = new Date();

  @BeforeInsert()
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }
}