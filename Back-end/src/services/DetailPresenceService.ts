// backend/src/services/DetailPresenceService.ts
import { AppDataSource } from "../config/data-source";
import { DetailPresence } from "../entities/DetailPresence";
import { BaseService } from "./BaseService";
import { FindOptionsWhere } from "typeorm";  // Ajout de cet import pour résoudre "Cannot find name 'FindOptionsWhere'"

const detailPresenceRepo = AppDataSource.getRepository(DetailPresence);

export class DetailPresenceService extends BaseService<DetailPresence> {
  constructor() {
    super(detailPresenceRepo);
  }

  async update(id: number, data: Partial<DetailPresence>): Promise<DetailPresence | null> {
    try {
      // Correction : Conversion vers 'unknown' d'abord pour satisfaire la contrainte de TypeORM
      const whereCondition = { id } as unknown as FindOptionsWhere<DetailPresence>;
      const entity = await this.repo.findOne({ where: whereCondition });
      if (!entity) {
        return null;
      }

      // Mise à jour des champs
      Object.assign(entity, data);
      
      return await this.repo.save(entity);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de DetailPresence :', error);
      throw error;
    }
  }
}