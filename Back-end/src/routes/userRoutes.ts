// src/routes/userRoutes.ts
import { createCrudRouter } from "./crudRouter";
import { userController } from "../controllers/UserController";
// import { authMiddleware } from "../middleware/authMiddleware";
import { User } from "../entities/User";

// export default createCrudRouter(userController, "");
// export default createCrudRouter(userController,User, "", [authMiddleware]);
export default createCrudRouter(userController,User, "");
