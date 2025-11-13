// backend/src/controllers/AgentController.ts
import { Request, Response } from "express";
import { AgentService } from "../services/AgentService";

export class AgentController {
  private agentService: AgentService;
  
  constructor() {
    this.agentService = new AgentService();
  }

  async getByMatricule(req: Request, res: Response): Promise<void> {
    try {
      const { matricule } = req.params;
      console.log('Recherche agent par matricule:', matricule);
      
      const agent = await this.agentService.getAgentByMatricule(matricule);
      
      if (!agent) {
        console.log('Agent non trouvé pour matricule:', matricule);
        res.status(404).json({ 
          success: false, 
          message: 'Agent non trouvé' 
        });
        return;
      }
      
      console.log('Agent trouvé:', agent);
      res.json({ 
        success: true, 
        data: agent 
      });
    } catch (error) {
      console.error('Erreur dans getByMatricule:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Erreur lors de la récupération de l\'agent' 
      });
    }
  }

  // NOUVELLE MÉTHODE : Recherche par nom et prénom
  async getByNomPrenom(req: Request, res: Response): Promise<void> {
    try {
      const { nom, prenom } = req.params;
      console.log('Recherche agent par nom/prénom:', { nom, prenom });
      
      if (!nom || !prenom) {
        res.status(400).json({ 
          success: false, 
          message: 'Le nom et le prénom sont requis' 
        });
        return;
      }
      
      const agent = await this.agentService.findAgentByNomPrenom(nom, prenom);
      
      if (!agent) {
        console.log('Agent non trouvé pour nom/prénom:', { nom, prenom });
        res.status(404).json({ 
          success: false, 
          message: 'Agent non trouvé' 
        });
        return;
      }
      
      console.log('Agent trouvé par nom/prénom:', agent);
      res.json({ 
        success: true, 
        data: agent 
      });
    } catch (error) {
      console.error('Erreur dans getByNomPrenom:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Erreur lors de la récupération de l\'agent' 
      });
    }
  }

//Recherche multiple par nom et prénom
async searchByNomPrenom(req: Request, res: Response): Promise<void> {
  try {
    const { nom, prenom } = req.query;
    
    console.log('Recherche agents par nom/prénom:', { nom, prenom });
    
    const agents = await this.agentService.findAgentsByNomPrenom(
      nom as string, 
      prenom as string
    );
    
    res.json({ 
      success: true, 
      data: agents 
    });
  } catch (error) {
    console.error('Erreur dans searchByNomPrenom:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Erreur lors de la recherche des agents' 
    });
  }
}
}