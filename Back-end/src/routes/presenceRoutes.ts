import { Router } from 'express';
import { PresenceController } from '../controllers/PresenceController';

const router = Router();
const presenceController = new PresenceController();

router.post('/entree', (req, res) => {
  console.log('POST /presences/entree appelé avec body:', req.body);
  presenceController.pointageEntree(req, res);
});

router.post('/sortie', (req, res) => {
  console.log('POST /presences/sortie appelé avec body:', req.body);
  presenceController.pointageSortie(req, res);
});

router.get('/historique', (req, res) => {
  console.log('GET /presences/historique appelé avec query:', req.query);
  presenceController.getHistorique(req, res);
});

router.get('/aujourdhui/:matricule', (req, res) => {
  console.log('GET /presences/aujourdhui/:matricule appelé avec matricule:', req.params.matricule);
  presenceController.getPresenceAujourdhui(req, res);
});

// Nouvelle route pour l'export
router.get('/export/:format', (req, res) => {
  console.log('GET /presences/export/:format appelé avec params:', req.params, 'query:', req.query);
  presenceController.exportHistorique(req, res);
});

// Dans presenceRoutes.ts
router.get('/aujourdhui/nom/:nom/prenom/:prenom', (req, res) => {
  console.log('GET /presences/aujourdhui/nom/:nom/prenom/:prenom appelé avec:', req.params);
  presenceController.getPresenceAujourdhuiByNomPrenom(req, res);
});

export default router;