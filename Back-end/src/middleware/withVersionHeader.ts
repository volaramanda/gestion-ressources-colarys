// src/middleware/withVersionHeader.ts
import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/data-source";

export function withVersionHeader(entity: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const repo = AppDataSource.getRepository(entity);
      const result = await repo
        .createQueryBuilder("e")
        .select("MAX(e.updatedAt)", "lastUpdate")
        .getRawOne();

      const version = result?.lastUpdate?.toString() || Date.now().toString();
      res.setHeader("X-Version", version);
    } catch (err) {
      console.error("❌ Impossible de définir X-Version:", err);
    }
    next();
  };
}
