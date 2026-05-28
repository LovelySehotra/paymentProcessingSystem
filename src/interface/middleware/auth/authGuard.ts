import { IUser } from '@/domain/models';
import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../error/error';

// Extend Express Request interface to include 'user'
declare global {
  namespace Express {
    interface Request {
      user?: IUser
    }
  }
}
export function IsAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) throw new UnauthorizedError('Please log in to access this resource');
  return next();
}

