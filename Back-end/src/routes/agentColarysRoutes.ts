import { Router } from "express";
import { AgentColarysController } from "../controllers/AgentColarysController";
import multer from "multer";
import path from "path";

const router = Router();

// Configuration Multer pour les routes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../public/uploads/'));
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
    fileSize: 5 * 1024 * 1024, // 5MB
  }
});

// Routes principales
router.get("/", AgentColarysController.getAllAgents);
router.get("/:id", AgentColarysController.getAgentById);
router.post("/", upload.single('image'), AgentColarysController.createAgent);
router.put("/:id", upload.single('image'), AgentColarysController.updateAgent);
router.delete("/:id", AgentColarysController.deleteAgent);

// Route dédiée pour l'upload d'image seule
router.post("/upload-image", upload.single('image'), AgentColarysController.uploadImage);

export default router;