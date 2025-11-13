// services/HistoAgentsService.ts
import { AppDataSource } from "../config/data-source";
import { HistoAgents } from "../entities/HistoAgents";
import { BaseService } from "./BaseService";

const distoAgentsRepo = AppDataSource.getRepository(HistoAgents);

export class HistoAgentsService extends BaseService<HistoAgents> {
  constructor() {
    super(distoAgentsRepo);
  }
}
