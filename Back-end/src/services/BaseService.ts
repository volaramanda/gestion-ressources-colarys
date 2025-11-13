// backend/src/services/BaseService.ts
import { Repository, FindOptionsWhere, Like, ObjectLiteral, DeepPartial } from "typeorm";

export class BaseService<T extends ObjectLiteral> {
  protected repo: Repository<T>;

  constructor(repo: Repository<T>) {
    this.repo = repo;
  }

  async findAll(relations: string[] = []): Promise<T[]> {
    return await this.repo.find({ relations });
  }

  async findById(id: number, relations: string[] = []): Promise<T | null> {
    // Correction similaire si erreur ici : utiliser 'unknown' pour la conversion
    const whereCondition = { id } as unknown as FindOptionsWhere<T>;
    return await this.repo.findOne({
      where: whereCondition,
      relations,
    });
  }

  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repo.create(data);
    return await this.repo.save(entity);
  }

  // backend/src/services/BaseService.ts
async update(id: number, data: Partial<T>): Promise<T | null> {
  try {
    // CORRECTION : Vérifier que data n'est pas vide
    if (!data || Object.keys(data).length === 0) {
      throw new Error("Aucune donnée fournie pour la mise à jour");
    }

    const whereCondition = { id } as unknown as FindOptionsWhere<T>;
    const entity = await this.repo.findOne({ where: whereCondition });
    
    if (!entity) return null;
    
    // CORRECTION : Vérifier que Object.assign fonctionne correctement
    Object.assign(entity, data);
    
    return await this.repo.save(entity);
  } catch (error) {
    console.error('Erreur dans BaseService.update:', error);
    throw error;
  }
}

  async delete(id: number) {
    return await this.repo.delete(id);
  }

  /**
   * ✅ Recherche générique par champ exact
   */
  async findBy(field: keyof T, value: any, relations: string[] = []): Promise<T[]> {
    return await this.repo.find({
      where: { [field]: value } as unknown as FindOptionsWhere<T>,  // Ajout de 'unknown' si nécessaire
      relations,
    });
  }

  /**
   * 🔥 Recherche générique avec LIKE (partiel)
   */
  async findByLike(field: keyof T, value: string, relations: string[] = []): Promise<T[]> {
    return await this.repo.find({
      where: { [field]: Like(`%${value}%`) } as unknown as FindOptionsWhere<T>,  // Ajout de 'unknown' si nécessaire
      relations,
    });
  }
}