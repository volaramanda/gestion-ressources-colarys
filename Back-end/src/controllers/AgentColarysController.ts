import { Request, Response, NextFunction } from "express";
import { AgentColarysService } from "../services/AgentColarysService";
import { ValidationError, NotFoundError } from "../middleware/errorMiddleware";
import fs from 'fs';
import path from 'path';


const agentService = new AgentColarysService();

export class AgentColarysController {
  
  static async getAllAgents(_req: Request, res: Response, next: NextFunction) {
    try {
      console.log("🔄 Controller: Getting all agents");
      const agents = await agentService.getAllAgents();
      res.json({
        success: true,
        data: agents,
        count: agents.length
      });
    } catch (error) {
      console.error("❌ Controller Error:", error);
      next(error);
    }
  }

  static async getAgentById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("ID invalide");
      }
      
      console.log(`🔄 Controller: Getting agent with ID: ${id}`);
      const agent = await agentService.getAgentById(id);
      res.json({
        success: true,
        data: agent
      });
    } catch (error) {
      console.error("❌ Controller Error:", error);
      next(error);
    }
  }

  
  static async createAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const agentData = req.body;
      
      // Gérer l'upload d'image
      if (req.file) {
        agentData.image = `/uploads/${req.file.filename}`;
      } else if (req.body.image) {
        // Si une URL d'image est fournie, l'utiliser directement
        agentData.image = req.body.image;
      }
      
      console.log("🔄 Controller: Creating new agent", agentData);
      
      const newAgent = await agentService.createAgent(agentData);
      res.status(201).json({
        success: true,
        message: "Agent créé avec succès",
        data: newAgent
      });
    } catch (error) {
      // Supprimer le fichier uploadé en cas d'erreur
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      console.error("❌ Controller Error:", error);
      next(error);
    }
  }

static async updateAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("ID invalide");
      }
      
      const agentData = req.body;
      let oldImagePath: string | null = null;
      
      // Récupérer l'ancienne image pour la supprimer plus tard si nécessaire
      const existingAgent = await agentService.getAgentById(id);
      if (existingAgent && existingAgent.image && existingAgent.image.startsWith('/uploads/')) {
        oldImagePath = path.join(__dirname, '../public', existingAgent.image);
      }
      
      // Gérer l'upload d'image
      if (req.file) {
        agentData.image = `/uploads/${req.file.filename}`;
      } else if (req.body.image) {
        // Si une URL d'image est fournie, l'utiliser directement
        agentData.image = req.body.image;
      }
      
      console.log(`🔄 Controller: Updating agent ${id}`, agentData);
      
      const updatedAgent = await agentService.updateAgent(id, agentData);
      
      // Supprimer l'ancienne image si une nouvelle a été uploadée
      if (req.file && oldImagePath && fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
      
      res.json({
        success: true,
        message: "Agent modifié avec succès",
        data: updatedAgent
      });
    } catch (error) {
      // Supprimer le fichier uploadé en cas d'erreur
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      console.error("❌ Controller Error:", error);
      next(error);
    }
  }


  static async deleteAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new ValidationError("ID invalide");
      }
      
      // Récupérer l'agent pour supprimer son image
      const agent = await agentService.getAgentById(id);
      let imagePath: string | null = null;
      
      if (agent.image && agent.image.startsWith('/uploads/')) {
        imagePath = path.join(__dirname, '../public', agent.image);
      }
      
      console.log(`🔄 Controller: Deleting agent ${id}`);
      await agentService.deleteAgent(id);
      
      // Supprimer l'image associée
      if (imagePath && fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      
      res.status(200).json({
        success: true,
        message: "Agent supprimé avec succès"
      });
    } catch (error) {
      console.error("❌ Controller Error:", error);
      next(error);
    }
  }

  // Endpoint pour uploader une image seule
  static async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new ValidationError("Aucun fichier uploadé");
      }
      
      const imageUrl = `/uploads/${req.file.filename}`;
      
      res.json({
        success: true,
        message: "Image uploadée avec succès",
        data: {
          imageUrl: imageUrl,
          filename: req.file.filename
        }
      });
    } catch (error) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      console.error("❌ Controller Error:", error);
      next(error);
    }
  }
}