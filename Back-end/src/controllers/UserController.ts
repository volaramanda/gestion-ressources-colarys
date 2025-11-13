import { Request, Response } from "express";
import { UserService } from "../services/UserService";
import { BaseController } from "./BaseController";
import { User } from "../entities/User";

const userService = new UserService();

export class UserController extends BaseController<User> {
  constructor() {
    super(userService);
  }

  create = async (req: Request, res: Response): Promise<Response> => {
    const { name, email, password, role } = req.body;
    try {
      const newUser = await userService.createUser(name, email, password, role);
      return res.status(201).json(newUser);
    } catch (err) {
      return res.status(400).json({ error: "Email déjà utilisé" });
    }
  };

  update = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { name, email, role, password } = req.body;
    const updatedUser = await userService.updateUser(
      parseInt(id),
      name,
      email,
      role,
      password
    );
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json(updatedUser);
  };
}

export const userController = new UserController();