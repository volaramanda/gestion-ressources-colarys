// backend/src/routes/planningRoutes.ts
import { Router } from 'express';
import multer from 'multer';
import { PlanningController } from '../controllers/PlanningController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', PlanningController.getPlannings);
router.post('/upload', upload.single('file'), PlanningController.uploadPlanning);
router.get('/weeks', PlanningController.getAvailableWeeks);
router.get('/agents', PlanningController.getAvailableAgents);
router.get('/months', PlanningController.getAvailableMonths);
router.get('/years', PlanningController.getAvailableYears); // Ajoutez cette ligne
router.get('/stats', PlanningController.getStats);
router.delete('/delete-all', PlanningController.deleteAllPlannings);

export default router;