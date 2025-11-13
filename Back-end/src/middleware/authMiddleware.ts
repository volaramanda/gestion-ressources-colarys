import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "secret_key";

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Cherche le token dans l'en-tête Authorization (Bearer token)
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  // Ou dans le body
  const tokenFromBody = req.body?.token;

  const token = tokenFromHeader || tokenFromBody;

  if (!token) return res.status(401).json({ message: "Token manquant" });

  try {
    const decoded = jwt.verify(token, SECRET);
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Token invalide" });
  }
}
