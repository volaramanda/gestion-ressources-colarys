import { Router } from 'express';
import { colarysEmployeeController } from '../controllers/ColarysEmployeeController';

const router = Router();

// ==================== SANTÉ ====================
router.get('/health', colarysEmployeeController.healthCheck);

// ==================== EMPLOYÉS ====================
router.get('/employees', colarysEmployeeController.getAllEmployees);
router.get('/employees/:matricule', colarysEmployeeController.getEmployee);
router.get('/statistiques', colarysEmployeeController.getStatistiques);
router.post('/employees', colarysEmployeeController.createEmployee);
router.post('/fiche-paie/export', colarysEmployeeController.exportFichesPaie);
router.put('/employees/:matricule', colarysEmployeeController.updateEmployee);
router.delete('/employees/:matricule', colarysEmployeeController.deleteEmployee);

// ==================== PRÉSENCES ====================
router.get('/presences', colarysEmployeeController.getPresences);
router.get('/presences/:year/:month', colarysEmployeeController.getMonthlyPresences);
router.put('/presences/:matricule/:year/:month/:day', colarysEmployeeController.updatePresence);

// 🔥 NOUVELLE ROUTE: Synchronisation automatique des jours OFF
router.post('/presences/sync-jours-off', colarysEmployeeController.syncJoursOff);

// ==================== SALAIRES ====================
router.get('/salaires', colarysEmployeeController.getSalaires);
router.get('/salaires/calculate/:year/:month', colarysEmployeeController.calculateSalaires);
router.put('/salaires/:matricule/:year/:month', colarysEmployeeController.updateSalaire);

// ==================== UTILITAIRES ====================
router.post('/update-conges', colarysEmployeeController.updateCongesAutomatique);

export default router;