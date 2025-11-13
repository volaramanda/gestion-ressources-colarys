// src/controllers/AgentController.ts
import { RoleService } from "../services/RoleService";
import { BaseController } from "./BaseController";
import { Role } from "../entities/Role";

const roleService = new RoleService();

export class RoleController extends BaseController<Role> {
  constructor() {
    super(roleService);
  }
}

export const roleController = new RoleController();
