import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/data-source";
import { AgentColarys } from "../entities/AgentColarys";
import { NotFoundError, ValidationError } from "../middleware/errorMiddleware";

const agentRepository = AppDataSource.getRepository(AgentColarys);

export const getAllAgents = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("🔄 Controller: Getting all agents");
    const agents = await agentRepository.find({
      order: { nom: "ASC", prenom: "ASC" }
    });
    
    res.json({
      success: true,
      data: agents,
      count: agents.length
    });
  } catch (error) {
    console.error("❌ Controller Error:", error);
    next(error);
  }
};

export const getAgentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new ValidationError("ID invalide");
    }
    
    console.log(`🔄 Controller: Getting agent with ID: ${id}`);
    const agent = await agentRepository.findOne({ where: { id } });
    
    if (!agent) {
      throw new NotFoundError("Agent non trouvé");
    }
    
    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error("❌ Controller Error:", error);
    next(error);
  }
};

// ... autres fonctions createAgent, updateAgent, deleteAgent