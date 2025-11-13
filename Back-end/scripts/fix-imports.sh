#!/bin/bash
# scripts/fix-imports.sh

echo "🔧 Correction des imports manquants..."

# Installer les dépendances manquantes
echo "📦 Installation de express-rate-limit..."
npm install express-rate-limit
npm install @types/express-rate-limit --save-dev

# Vérifier la structure des dossiers
echo "📁 Vérification de la structure..."
mkdir -p src/controllers
mkdir -p src/routes

# Vérifier si les fichiers existent
if [ ! -f "src/routes/mobileEmployesRoutes.ts" ]; then
    echo "📝 Création de src/routes/mobileEmployesRoutes.ts..."
    cat > src/routes/mobileEmployesRoutes.ts << 'ROUTES_EOF'
import { Router } from 'express';
import { MobileEmployesController } from '../controllers/MobileEmployesController';

const router = Router();
const controller = new MobileEmployesController();

router.get('/', (req, res) => controller.getEmployesFromPython(req, res));
router.get('/:matricule', (req, res) => controller.getEmployeDetail(req, res));
router.get('/stats', (req, res) => controller.getMobileStats(req, res));
router.get('/search', (req, res) => controller.searchEmployes(req, res));
router.post('/sync', (req, res) => controller.syncToSupabase(req, res));
router.get('/health', (req, res) => controller.healthCheck(req, res));

export default router;
ROUTES_EOF
fi

if [ ! -f "src/controllers/MobileEmployesController.ts" ]; then
    echo "📝 Création de src/controllers/MobileEmployesController.ts..."
    cat > src/controllers/MobileEmployesController.ts << 'CONTROLLER_EOF'
import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

interface PythonApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  count?: number;
  timestamp?: string;
}

interface MobileEmploye {
  matricule: string;
  nom_complet: string;
  fonction: string;
  salaire_base: number;
  solde_conge: number;
  date_embauche: string;
  anciennete: string;
  telephone: string;
  campagne: string;
  categorie: string;
  statut_conge: string;
  badges: string[];
  contact_urgence: {
    nom: string;
    telephone: string;
    relation: string;
  };
}

export class MobileEmployesController {
  private pythonApiUrl: string;
  private supabase;

  constructor() {
    this.pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:5002';
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );
    console.log('📡 MobileEmployesController initialisé');
  }

  async getEmployesFromPython(req: Request, res: Response): Promise<void> {
    try {
      console.log('📡 Appel à l\\'API Python pour les employés...');
      const response = await fetch(\`\${this.pythonApiUrl}/mobile/employes\`);
      
      if (!response.ok) {
        throw new Error(\`API Python non disponible: \${response.status}\`);
      }

      const result: PythonApiResponse = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Erreur inconnue de l\\'API Python');
      }

      res.json({
        success: true,
        data: result.data,
        count: result.count,
        source: 'python_api',
        timestamp: result.timestamp
      });
    } catch (error: any) {
      console.error('❌ Erreur récupération employés Python:', error);
      res.status(503).json({
        success: false,
        error: 'Service employés temporairement indisponible',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getEmployeDetail(req: Request, res: Response): Promise<void> {
    try {
      const { matricule } = req.params;
      if (!matricule) {
        res.status(400).json({ success: false, error: 'Matricule requis' });
        return;
      }

      console.log(\`📡 Récupération détail employé: \${matricule}\`);
      const response = await fetch(\`\${this.pythonApiUrl}/mobile/employes/\${matricule}\`);
      
      if (!response.ok) {
        throw new Error(\`Employé non trouvé: \${response.status}\`);
      }

      const result: PythonApiResponse = await response.json();
      if (!result.success) {
        res.status(404).json({ success: false, error: result.error || 'Employé non trouvé' });
        return;
      }

      res.json({ success: true, data: result.data, source: 'python_api' });
    } catch (error: any) {
      console.error(\`❌ Erreur détail employé \${req.params.matricule}:\`, error);
      res.status(500).json({
        success: false,
        error: 'Erreur récupération détail employé',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getMobileStats(req: Request, res: Response): Promise<void> {
    try {
      console.log('📊 Récupération statistiques mobiles...');
      const response = await fetch(\`\${this.pythonApiUrl}/mobile/stats\`);
      
      if (!response.ok) {
        throw new Error(\`API Python stats non disponible: \${response.status}\`);
      }

      const result: PythonApiResponse = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Erreur statistiques API Python');
      }

      res.json({
        success: true,
        data: result.data,
        source: 'python_api',
        timestamp: result.timestamp
      });
    } catch (error: any) {
      console.error('❌ Erreur statistiques:', error);
      res.status(503).json({
        success: false,
        error: 'Service statistiques indisponible',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async searchEmployes(req: Request, res: Response): Promise<void> {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        res.status(400).json({ success: false, error: 'Paramètre de recherche "q" requis' });
        return;
      }

      console.log(\`🔍 Recherche employés: "\${q}"\`);
      const response = await fetch(\`\${this.pythonApiUrl}/mobile/search?q=\${encodeURIComponent(q)}\`);
      
      if (!response.ok) {
        throw new Error(\`API recherche non disponible: \${response.status}\`);
      }

      const result: PythonApiResponse = await response.json();
      res.json({
        success: true,
        data: result.data,
        count: result.count,
        query: q,
        source: 'python_api'
      });
    } catch (error: any) {
      console.error('❌ Erreur recherche:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la recherche',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async syncToSupabase(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔄 Début synchronisation Supabase...');
      const response = await fetch(\`\${this.pythonApiUrl}/mobile/employes\`);
      
      if (!response.ok) {
        throw new Error('API Python indisponible pour synchronisation');
      }

      const result: PythonApiResponse = await response.json();
      if (!result.success || !result.data) {
        throw new Error('Données invalides depuis API Python');
      }

      const employes: MobileEmploye[] = result.data;
      console.log(\`📊 \${employes.length} employés à synchroniser\`);
      
      res.json({
        success: true,
        message: 'Synchronisation simulée - Fonctionnalité à implémenter',
        stats: { total: employes.length, message: 'La création de la table Supabase est nécessaire' },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('❌ Erreur synchronisation:', error);
      res.status(500).json({
        success: false,
        error: 'Échec synchronisation',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const response = await fetch(\`\${this.pythonApiUrl}/mobile/health\`);
      if (!response.ok) {
        throw new Error(\`API Python non healthy: \${response.status}\`);
      }

      const result = await response.json();
      res.json({
        success: true,
        python_api: result,
        backend: 'healthy',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(503).json({
        success: false,
        python_api: 'unhealthy',
        backend: 'healthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}
CONTROLLER_EOF
fi

echo "✅ Corrections appliquées!"
echo "📋 Prochaines étapes:"
echo "   1. Redémarrer le serveur: npm run dev"
echo "   2. Tester: curl http://localhost:3000/api/mobile/employes/health"
echo "   3. Vérifier que l'API Python est démarrée sur le port 5002"
