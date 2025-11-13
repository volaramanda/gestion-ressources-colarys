import { Request, Response, NextFunction } from 'express';

export class NotFoundError extends Error {
  statusCode: number;
  
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export class ValidationError extends Error {
  statusCode: number;
  
  constructor(message: string = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

export class UnauthorizedError extends Error {
  statusCode: number;
  
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
  }
}

export interface CustomError extends Error {
  statusCode?: number;
}

export const errorMiddleware = (
  error: CustomError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('Error:', error);

  // Défaut à 500 si le statusCode n'est pas défini
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  });
};

// // backend/src/middleware/errorMiddleware.ts
// import { Request, Response, NextFunction } from "express";

// export class AppError extends Error {
//   constructor(public message: string, public statusCode: number = 400) {
//     super(message);
//     this.name = "AppError";
//   }
// }

// export function errorMiddleware(
//   error: unknown,
//   _req: Request,
//   res: Response,
//   next: NextFunction
// ): void {
//   if (error instanceof AppError) {
//     res.status(error.statusCode).json({ error: error.message });
//   } else if (error instanceof Error) {
//     res.status(500).json({ error: error.message });
//   } else {
//     res.status(500).json({ error: "Erreur serveur inconnue" });
//   }
// }