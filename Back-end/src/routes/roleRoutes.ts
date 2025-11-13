// src/routes/agentRoutes.ts
import { createCrudRouter } from "./crudRouter";
import { roleController } from "../controllers/RoleController";
import { authMiddleware } from "../middleware/authMiddleware";
import { Role } from "../entities/Role";

// export default createCrudRouter(roleController, "");
export default createCrudRouter(roleController,Role,"", [authMiddleware]);
