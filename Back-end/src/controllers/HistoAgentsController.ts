// src/controllers/AgentController.ts
import { HistoAgentsService } from "../services/HistoAgentsService";
import { BaseController } from "./BaseController";
import { HistoAgents } from "../entities/HistoAgents";

const histoAgentsService = new HistoAgentsService();

export class HistoAgentsController extends BaseController<HistoAgents> {
  constructor() {
    super(histoAgentsService);
  }
}

export const histoAgentsController = new HistoAgentsController();
