// backend/src/services/AgentService.ts
import { AppDataSource } from "../config/data-source";
import { Agent } from "../entities/Agent";

export class AgentService {
  private agentRepository = AppDataSource.getRepository(Agent);

  constructor() {
    this.agentRepository = AppDataSource.getRepository(Agent);
  }

  async createAgent(agentData: Partial<Agent>): Promise<Agent> {
    const agent = this.agentRepository.create(agentData);
    return await this.agentRepository.save(agent);
  }

  async findAgentByMatricule(matricule: string | null): Promise<Agent | null> {
    if (!matricule) return null;
    return await this.agentRepository.findOne({
      where: { matricule },
      relations: ["presences"]
    });
  }

  // NOUVELLE MÉTHODE : Recherche par nom et prénom
  async findAgentByNomPrenom(nom: string, prenom: string): Promise<Agent | null> {
    return await this.agentRepository.findOne({
      where: { 
        nom: nom,
        prenom: prenom 
      },
      relations: ["presences"]
    });
  }

  async updateAgentSignature(matricule: string | null, signature: string): Promise<Agent> {
    if (!matricule) {
      throw new Error("Matricule requis pour mise à jour");
    }
    const agent = await this.findAgentByMatricule(matricule);
    if (!agent) {
      throw new Error("Agent non trouvé");
    }
    agent.signature = signature;
    return await this.agentRepository.save(agent);
  }

  async getAllAgents(): Promise<Agent[]> {
    return await this.agentRepository.find({
      relations: ["presences"],
      order: { nom: "ASC" }
    });
  }

  async getAgentByMatricule(matricule: string | null): Promise<Agent | null> {
    if (!matricule) return null;
    return await this.agentRepository.findOne({ 
      where: { matricule } 
    });
  }

//Recherche multiple par nom et prénom
async findAgentsByNomPrenom(nom?: string, prenom?: string): Promise<Agent[]> {
  const queryBuilder = this.agentRepository.createQueryBuilder('agent');
  
  if (nom) {
    queryBuilder.andWhere('agent.nom ILIKE :nom', { nom: `%${nom}%` });
  }
  
  if (prenom) {
    queryBuilder.andWhere('agent.prenom ILIKE :prenom', { prenom: `%${prenom}%` });
  }
  
  return await queryBuilder
    .leftJoinAndSelect('agent.presences', 'presences')
    .orderBy('agent.nom', 'ASC')
    .addOrderBy('agent.prenom', 'ASC')
    .getMany();
}
}