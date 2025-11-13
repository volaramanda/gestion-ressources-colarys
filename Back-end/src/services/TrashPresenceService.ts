// services/PresenceService.ts
import { AppDataSource } from "../config/data-source";
import { Trashpresence } from "../entities/Trashpresence";
import { BaseService } from "./BaseService";

const trashpresenceRepo = AppDataSource.getRepository(Trashpresence);

export class TrashpresenceService extends BaseService<Trashpresence> {
  constructor() {
    super(trashpresenceRepo);
  }
}
