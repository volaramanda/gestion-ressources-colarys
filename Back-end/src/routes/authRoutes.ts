// src/routes/authRoutes.ts
import { Router } from "express";
import { AuthController } from "../controllers/AuthController";

const router = Router();

router.post('/login', AuthController.login);

// Debug: Affiche les routes enregistrées
console.log('Auth routes registered:');
console.log('POST /login → /api/auth/login');

export default router;
