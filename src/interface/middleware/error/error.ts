// errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Not authorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}

export class ValidationError extends AppError {
  errors: any[];
  constructor(errors: any[], message = 'Validation Error') {
    super(message, 400);
    this.errors = errors;
  }
}

// IMPORTANT: Error handler must have exactly 4 parameters (err, req, res, next)
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Log the error for debugging
  console.error('Error caught by middleware:', err);

  // Set default error values
  let error = { ...err };
  error.message = err.message;

  // Handle known AppError types
  if (err instanceof AppError) {
    const response: any = {
      success: false,
      status: err.status,
      message: err.message,
    };

    if (err instanceof ValidationError) {
      response.errors = err.errors;
    }

    return res.status(err.statusCode).json(response);
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e: any) => ({
      field: e.path,
      message: e.message,
    }));

    return res.status(400).json({
      success: false,
      status: 'fail',
      message: 'Validation Error',
      errors,
    });
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];

    return res.status(400).json({
      success: false,
      status: 'fail',
      message: `Duplicate field value: ${field} = ${value}. Please use another value!`,
    });
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      status: 'fail',
      message: `Invalid ${err.path}: ${err.value}`,
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      status: 'fail',
      message: 'Invalid token. Please log in again!',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      status: 'fail',
      message: 'Your token has expired! Please log in again.',
    });
  }

  // Handle unexpected errors
  if (process.env.NODE_ENV === 'development') {
    return res.status(500).json({
      success: false,
      status: 'error',
      message: error.message || 'Something went wrong!',
      error: err,
      stack: err.stack,
    });
  }

  // Production error response
  return res.status(500).json({
    success: false,
    status: 'error',
    message: error.message || 'Something went wrong!',
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const error = new NotFoundError(
    `Can't find ${req.originalUrl} on this server!`,
  );
  next(error);
};
