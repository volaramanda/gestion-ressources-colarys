// src/routes/agentRoutes.ts
import { createCrudRouter } from "./crudRouter";
import { histoAgentsController } from "../controllers/HistoAgentsController";
import { authMiddleware } from "../middleware/authMiddleware";
import { HistoAgents } from "../entities/HistoAgents";
// export default createCrudRouter(histoAgentsController, "");
export default createCrudRouter(histoAgentsController,HistoAgents, "", [authMiddleware]);
