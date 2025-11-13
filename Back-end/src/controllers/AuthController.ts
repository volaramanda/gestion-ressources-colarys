import { Request, Response } from "express";
import { AuthService } from "../services/Auth/AuthService";
import { logger } from "../config/logger";

export class AuthController {
  static async login(req: Request, res: Response) {
    const { email, password } = req.body;

    // Validation des entrées
    if (!email || !password) {
      logger.warn('Tentative de connexion sans credentials', { 
        email: email || 'non fourni',
        ip: req.ip
      });
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    try {
      logger.info(`Tentative de connexion pour ${trimmedEmail}`, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      // Appel du service d'authentification
      const { user, token } = await AuthService.login(email, password);

      // Formatage sécurisé de la réponse
      const userResponse = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt
      };

      logger.info(`Connexion réussie pour ${trimmedEmail}`, { 
        userId: user.id,
        role: user.role
      });

         return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    });

  } catch (error) {
    return res.status(401).json({ error: "Email ou mot de passe incorrect" });

      // Gestion des erreurs spécifiques
      // let status = 500;
      // let message = "Erreur d'authentification";

      // if (error.message.includes("Identifiants invalides")) {
      //   status = 401;
      //   message = "Email ou mot de passe incorrect";
      // } else if (error.message.includes("Mot de passe incorrect")) {
      //   status = 401;
      //   message = "Mot de passe incorrect";
      // }

      // return res.status(status).json({
      //   status,
      //   success: false,
      //   message,
      //   data: null
      // });
    }
  }
}