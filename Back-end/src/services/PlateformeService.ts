// services/PlateformeService.ts
import { AppDataSource } from "../config/data-source";
import { Plateforme } from "../entities/Plateforme";
import { BaseService } from "./BaseService";

const plateformeRepo = AppDataSource.getRepository(Plateforme);

export class PlateformeService extends BaseService<Plateforme> {
  constructor() {
    super(plateformeRepo);
  }
}
