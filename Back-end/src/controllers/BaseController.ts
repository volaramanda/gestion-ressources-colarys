// src/controllers/BaseController.ts
import { Request, Response } from "express";
import { BaseService } from "../services/BaseService";
import { HttpStatus } from "../utils/httpStatus";

// Supprimez la contrainte ObjectLiteral si elle cause des problèmes
export class BaseController<T extends object> {  // Utilisez 'object' au lieu de 'ObjectLiteral'
  protected service: BaseService<T>;
  protected withRelations: string[] = [];

  constructor(service: BaseService<T>, relations: string[] = []) {
    this.service = service;
    this.withRelations = relations;
  }

  getAll = async (_req: Request, res: Response) => {
    try {
      const items = await this.service.findAll(this.withRelations);
      const status = HttpStatus.OK;
      return res.status(status).json({
        success: true,
        status,
        message: "List retrieved successfully",
        data: items,
      });
    } catch (err) {
      const status = HttpStatus.INTERNAL_SERVER_ERROR;
      return res.status(status).json({
        success: false,
        status,
        message: "Server error during fetching list",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  getOne = async (req: Request, res: Response) => {
    try {
      const item = await this.service.findById(parseInt(req.params.id), this.withRelations);
      if (!item) {
        const status = HttpStatus.NOT_FOUND;
        return res.status(status).json({
          success: false,
          status,
          message: "Item not found",
        });
      }

      const status = HttpStatus.OK;
      return res.status(status).json({
        success: true,
        status,
        message: "Item retrieved successfully",
        data: item,
      });
    } catch (err) {
      const status = HttpStatus.INTERNAL_SERVER_ERROR;
      return res.status(status).json({
        success: false,
        status,
        message: "Server error during fetching item",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const newItem = await this.service.create(req.body);
      const status = HttpStatus.CREATED;
      return res.status(status).json({
        success: true,
        status,
        message: "Item created successfully",
        data: newItem,
      });
    } catch (err) {
      const status = HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        status,
        message: "Error during creation",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const updated = await this.service.update(parseInt(req.params.id), req.body);
      if (!updated) {
        const status = HttpStatus.NOT_FOUND;
        return res.status(status).json({
          success: false,
          status,
          message: "Item not found",
        });
      }

      const status = HttpStatus.OK;
      return res.status(status).json({
        success: true,
        status,
        message: "Item updated successfully",
        data: updated,
      });
    } catch (err) {
      const status = HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        status,
        message: "Error during update",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const result = await this.service.delete(parseInt(req.params.id));
      if (result.affected === 0) {
        const status = HttpStatus.NOT_FOUND;
        return res.status(status).json({
          success: false,
          status,
          message: "Item not found",
        });
      }

      const status = HttpStatus.OK;
      return res.status(status).json({
        success: true,
        status,
        message: "Item deleted successfully",
      });
    } catch (err) {
      const status = HttpStatus.INTERNAL_SERVER_ERROR;
      return res.status(status).json({
        success: false,
        status,
        message: "Server error during deletion",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };
}