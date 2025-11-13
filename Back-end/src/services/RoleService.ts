// src/services/RoleService.ts
import { AppDataSource } from "../config/data-source";
import { Role } from "../entities/Role";
import { BaseService } from "./BaseService";
import { logger } from "../config/logger";
import { FindOptionsWhere } from "typeorm";

const roleRepository = AppDataSource.getRepository(Role);

export class RoleService extends BaseService<Role> {
  constructor() {
    super(roleRepository);
  }

  /**
   * Récupère tous les rôles avec pagination et filtres
   */
  async getAllRoles(filter: FindOptionsWhere<Role> = {}, skip = 0, take = 10) {
    try {
      logger.debug(`Fetching roles with filter: ${JSON.stringify(filter)}`);
      const [data, total] = await roleRepository.findAndCount({
        where: filter,
        skip,
        take,
        order: { id: "ASC" }
      });

      return { data, total, skip, take };
    } catch (error) {
      logger.error("Failed to fetch roles", { error });
      throw new Error("Erreur lors de la récupération des rôles");
    }
  }

  /**
   * Crée un nouveau rôle avec validation
   */
  async createRole(roleData: Partial<Role>) {
    if (!roleData.role) {
      throw new Error("Le nom du rôle est requis");
    }

    try {
      const newRole = roleRepository.create(roleData);
      await roleRepository.save(newRole);
      logger.info(`Role created: ${newRole.role}`);
      return newRole;
    } catch (error) {
      logger.error("Role creation failed", { error });
      throw new Error("Erreur lors de la création du rôle");
    }
  }
}


// services/RoleService.ts
// import { AppDataSource } from "../config/data-source";
// import { Role } from "../entities/Role";
// import { BaseService } from "./BaseService";

// const roleRepo = AppDataSource.getRepository(Role);

// export class RoleService extends BaseService<Role> {
//   constructor() {
//     super(roleRepo);
//   }
// }
