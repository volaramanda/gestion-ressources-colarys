import { AppDataSource } from "../../config/data-source";
import { User } from "../../entities/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { logger } from "../../config/logger";

const userRepository = AppDataSource.getRepository(User);

export class AuthService {
  static async login(email: string, password: string) {
    try {
      // 1. Nettoyage des entrées
      const cleanEmail = email.toLowerCase().trim();
      const cleanPassword = password.trim();

      // 2. Vérification des entrées
      if (!cleanEmail || !cleanPassword) {
        throw new Error("Email and password required");
      }

      // 3. Récupération utilisateur
      const user = await userRepository
        .createQueryBuilder("user")
        .addSelect("user.password")
        .where("user.email = :email", { email: cleanEmail })
        .getOne();

      if (!user) {
        throw new Error("Invalid credentials");
      }

      // 4. DEBUG: Affichage des valeurs pour diagnostic
      console.log("------ DEBUG AUTH ------");
      console.log("Input password:", cleanPassword);
      console.log("Stored hash:", user.password);
      console.log("Hash length:", user.password.length);
      console.log("Hash type:", typeof user.password);

      // 5. Comparaison des mots de passe
      const isMatch = await bcrypt.compare(cleanPassword, user.password);
      console.log("Match result:", isMatch);

      if (!isMatch) {
        // 6. Génération d'un nouveau hash pour comparaison
        const testHash = await bcrypt.hash(cleanPassword, 10);
        console.log("New generated hash:", testHash);
        console.log("Compare new hash with stored:", testHash === user.password);

        throw new Error("Invalid credentials");
      }

      // 7. Génération du token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: "1d" }
      );

      // 8. Réponse sans le mot de passe
      const { password: _, ...safeUser } = user;
      return { user: safeUser, token };

    } catch (error) {
      console.error("FULL ERROR DETAILS:", error);
      throw error;
    }
  }
}

