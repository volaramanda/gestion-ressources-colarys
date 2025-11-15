import "reflect-metadata";
import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { AppDataSource } from "./config/data-source";
import userRoutes from "./routes/userRoutes";
import authRoutes from "./routes/authRoutes";
import agentRoutes from "./routes/agentRoutes";
import presenceRoutes from "./routes/presenceRoutes";
import detailPresenceRoutes from "./routes/detailPresenceRoutes";
import histoAgentsRoutes from "./routes/histoAgentsRoutes";
import roleRoutes from "./routes/roleRoutes";
import planningRoutes from "./routes/planningRoutes";
import { errorMiddleware } from "./middleware/errorMiddleware";
import agentColarysRoutes from "./routes/agentColarysRoutes";
// 🔥 ROUTES COLARYS
import colarysRoutes from "./routes/colarysRoutes";

dotenv.config();

// 🔥 VARIABLES D'ENVIRONNEMENT REQUISES
const requiredEnvVars = [
  'JWT_SECRET',
  'POSTGRES_HOST',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'SUPABASE_URL',
  'SUPABASE_KEY'
];
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`❌ ${envVar} must be defined in .env file`);
  }
});

const PORT = process.env.PORT || 3000;
const API_PREFIX = "/api";
const app = express();

// Configuration Multer pour l'upload d'images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, 'agent-' + uniqueSuffix + fileExtension);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images sont autorisées!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  }
});

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
  'https://grp-colarys-concept.vercel.app',
  ...(process.env.ALLOWED_ORIGINS || "").split(",").map(origin => origin.trim())
].filter(origin => origin);

// Rate limiting pour la protection
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    error: 'Trop de requêtes, veuillez réessayer plus tard.'
  }
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`📱 ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
  next();
});

// 🔥 APPLIQUER LE RATE LIMITING
app.use(apiLimiter);

// 🔥 ROUTES PRINCIPALES
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/agents`, agentRoutes);
app.use(`${API_PREFIX}/agent-history`, histoAgentsRoutes);
app.use(`${API_PREFIX}/attendance-details`, detailPresenceRoutes);
app.use(`${API_PREFIX}/roles`, roleRoutes);
app.use(`${API_PREFIX}/plannings`, planningRoutes);
app.use(`${API_PREFIX}/presences`, presenceRoutes);
app.use(`${API_PREFIX}/agents-colarys`, agentColarysRoutes);
// 🔥 ROUTES COLARYS - GESTION DES EMPLOYÉS
app.use(`${API_PREFIX}/colarys`, colarysRoutes);

// Middleware d'erreur
app.use(errorMiddleware);

// Route de santé globale
app.get(`${API_PREFIX}/health`, (_req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    service: "Colarys Concept API",
    version: "2.0.0",
    endpoints: {
      auth: `${API_PREFIX}/auth/login`,
      health: `${API_PREFIX}/health`,
      planning: `${API_PREFIX}/plannings`,
      agents: `${API_PREFIX}/agents`,
      presences: `${API_PREFIX}/presences`,
      // 🔥 NOUVEAUX ENDPOINTS COLARYS
      colarys_employees: `${API_PREFIX}/colarys/employees`,
      colarys_presences: `${API_PREFIX}/colarys/presences`,
      colarys_salaries: `${API_PREFIX}/colarys/salaires`,
      colarys_health: `${API_PREFIX}/colarys/health`
    }
  });
});

// Route 404
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: "Endpoint not found", 
    requestedUrl: req.url 
  });
});

// Gestionnaire d'erreurs global
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("❌ Error:", err);
  res.status(500).json({ 
    success: false,
    error: "Internal server error",
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Initialisation de l'application
export const initializedApp = (async () => {
  try {
    await AppDataSource.initialize();
    console.log("📦 Connected to database");
    console.log("✅ All services initialized");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}${API_PREFIX}/health`);
      console.log(`🔗 Auth endpoint: http://localhost:${PORT}${API_PREFIX}/auth/login`);
      console.log(`🔗 Planning API: http://localhost:${PORT}${API_PREFIX}/plannings`);
      console.log(`🔗 Agents Colarys: http://localhost:${PORT}${API_PREFIX}/agents-colarys`);
      console.log(`🔗 Colarys Employees: http://localhost:${PORT}${API_PREFIX}/colarys/employees`);
      
      console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`);
      console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    return app;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
})();


// ... gardez tout votre code jusqu'à la ligne suivante :

// Gestionnaire d'erreurs global
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("❌ Error:", err);
  res.status(500).json({ 
    success: false,
    error: "Internal server error",
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ⬇️⬇️⬇️ AJOUTEZ CE CODE À LA PLACE ⬇️⬇️⬇️

// Export pour Vercel
export default app;

// Démarrage du serveur seulement en développement local
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const startServer = async () => {
    try {
      await AppDataSource.initialize();
      console.log("📦 Connected to database");
      console.log("✅ All services initialized");

      const PORT = process.env.PORT || 3000;
      app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`🔗 Health check: http://localhost:${PORT}${API_PREFIX}/health`);
        console.log(`🔗 Auth endpoint: http://localhost:${PORT}${API_PREFIX}/auth/login`);
        console.log(`🔗 Planning API: http://localhost:${PORT}${API_PREFIX}/plannings`);
        console.log(`🔗 Agents Colarys: http://localhost:${PORT}${API_PREFIX}/agents-colarys`);
        console.log(`🔗 Colarys Employees: http://localhost:${PORT}${API_PREFIX}/colarys/employees`);
        console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`);
        console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
      });
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      process.exit(1);
    }
  };

  startServer();
}

