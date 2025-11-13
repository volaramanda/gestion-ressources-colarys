// services/UserService.ts
import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { BaseService } from "./BaseService";
import bcrypt from "bcryptjs";
import { QueryFailedError } from "typeorm";

const userRepo = AppDataSource.getRepository(User);

export class UserService extends BaseService<User> {
  constructor() {
    super(userRepo);
  }

  async createUser(name: string, email: string, password: string, role: string = "agent") {
    // Vérification de l'existence de l'email
    const existingUser = await userRepo.findOne({ where: { email } });
    if (existingUser) {
      throw new Error("L'email est déjà utilisé");
    }

    // Validation des champs requis
    if (!name || !email || !password) {
      throw new Error("Tous les champs obligatoires doivent être remplis");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    try {
      return await this.create({ 
        name, 
        email, 
        password: hashedPassword, 
        role 
      });
    } catch (error) {
      if (error instanceof QueryFailedError) {
        // Gestion spécifique des erreurs PostgreSQL
        if (error.message.includes("unique constraint")) {
          throw new Error("L'email existe déjà");
        }
        if (error.message.includes("not-null constraint")) {
          throw new Error("Un champ obligatoire est manquant");
        }
      }
      throw error;
    }
  }

  async updateUser(id: number, name?: string, email?: string, role?: string, password?: string) {
    const user = await this.repo.findOneBy({ id });
    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    // Vérification de l'unicité si email modifié
    if (email && email !== user.email) {
      const emailExists = await userRepo.exist({ where: { email } });
      if (emailExists) {
        throw new Error("Le nouvel email est déjà utilisé");
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    try {
      return await this.repo.save(user);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw new Error("Erreur lors de la mise à jour de l'utilisateur");
      }
      throw error;
    }
  }

  // Méthode supplémentaire utile
  async getUserByEmail(email: string) {
    return await userRepo.findOne({ 
      where: { email },
      select: ["id", "name", "email", "role", "password"] 
    });
  }
}