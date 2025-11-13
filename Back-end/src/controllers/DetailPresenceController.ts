// backend/src/controllers/DetailPresenceController.ts
import { Request, Response } from 'express';
import { DetailPresenceService } from '../services/DetailPresenceService';
import { DetailPresence } from '../entities/DetailPresence';

export class DetailPresenceController {
  private service: DetailPresenceService;

  constructor() {
    this.service = new DetailPresenceService();
    console.log('DetailPresenceController initialized with service:', this.service);
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const entities = await this.service.findAll(['agent', 'presence']);
      res.json({ success: true, data: entities });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Erreur lors de la récupération des données' 
      });
    }
  }

  async getOne(req: Request, res: Response): Promise<void> {
    try {
      const entity = await this.service.findById(parseInt(req.params.id), ['agent', 'presence']);
      if (!entity) {
        res.status(404).json({ success: false, message: 'Entité non trouvée' });
        return;
      }
      res.json({ success: true, data: entity });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Erreur lors de la récupération de l\'entité' 
      });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const entity = await this.service.create(req.body);
      res.status(201).json({ success: true, data: entity });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Erreur lors de la création' 
      });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const entity = await this.service.update(parseInt(req.params.id), req.body);
      if (!entity) {
        res.status(404).json({ success: false, message: 'Entité non trouvée' });
        return;
      }
      res.json({ success: true, data: entity });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Erreur lors de la mise à jour' 
      });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await this.service.delete(parseInt(req.params.id));
      res.json({ success: true, message: 'Entité supprimée' });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Erreur lors de la suppression' 
      });
    }
  }
}