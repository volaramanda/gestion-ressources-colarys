import { AppDataSource } from "../config/data-source";
import { AgentColarys } from "../entities/AgentColarys";
import { NotFoundError, ValidationError } from "../middleware/errorMiddleware";
import { Repository } from "typeorm"; // Import ajouté

export class AgentColarysService {
  private agentRepository: Repository<AgentColarys>;

  constructor() {
    // Initialisation directe si la DataSource est déjà initialisée
    this.agentRepository = AppDataSource.getRepository(AgentColarys);
  }

  // private async ensureInitialized() {
  //   if (!this.agentRepository) {
  //     if (!AppDataSource.isInitialized) {
  //       await AppDataSource.initialize();
  //     }
  //     this.agentRepository = AppDataSource.getRepository(AgentColarys);
  //   }
  // }

  async getAllAgents(): Promise<AgentColarys[]> {
    try {
      console.log("🔄 Service: Getting all agents from database");
      const agents = await this.agentRepository.find({
        order: { nom: "ASC", prenom: "ASC" }
      });
      console.log(`✅ Service: Found ${agents.length} agents`);
      return agents;
    } catch (error) {
      console.error("❌ Service Error in getAllAgents:", error);
      throw new Error("Erreur lors de la récupération des agents");
    }
  }

  async getAgentById(id: number): Promise<AgentColarys> {
    // await this.ensureInitialized();
    
    try {
      console.log(`🔄 Service: Getting agent by ID: ${id}`);
      const agent = await this.agentRepository.findOne({ where: { id } });
      if (!agent) {
        throw new NotFoundError("Agent non trouvé");
      }
      console.log(`✅ Service: Found agent: ${agent.nom} ${agent.prenom}`);
      return agent;
    } catch (error) {
      console.error("❌ Service Error in getAgentById:", error);
      throw error;
    }
  }

  async createAgent(agentData: Partial<AgentColarys>): Promise<AgentColarys> {
    // await this.ensureInitialized();
    
    try {
      if (!agentData.matricule || !agentData.nom || !agentData.prenom || !agentData.role || !agentData.mail) {
        throw new ValidationError("Tous les champs obligatoires doivent être remplis");
      }

      const existingAgent = await this.agentRepository.findOne({
        where: [
          { matricule: agentData.matricule },
          { mail: agentData.mail }
        ]
      });

      if (existingAgent) {
        throw new ValidationError("Le matricule ou l'email existe déjà");
      }

      const agent = this.agentRepository.create(agentData);
      return await this.agentRepository.save(agent);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error("Erreur lors de la création de l'agent");
    }
  }

  async updateAgent(id: number, agentData: Partial<AgentColarys>): Promise<AgentColarys> {
    // await this.ensureInitialized();
    
    try {
      const agent = await this.getAgentById(id);
      
      if (agentData.matricule || agentData.mail) {
        const existingAgent = await this.agentRepository.findOne({
          where: [
            { matricule: agentData.matricule },
            { mail: agentData.mail }
          ]
        });

        if (existingAgent && existingAgent.id !== id) {
          throw new ValidationError("Le matricule ou l'email existe déjà pour un autre agent");
        }
      }

      await this.agentRepository.update(id, agentData);
      return await this.getAgentById(id);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new Error("Erreur lors de la modification de l'agent");
    }
  }

  async deleteAgent(id: number): Promise<void> {
    // await this.ensureInitialized();
    
    try {
      const agent = await this.getAgentById(id);
      await this.agentRepository.remove(agent);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new Error("Erreur lors de la suppression de l'agent");
    }
  }
}