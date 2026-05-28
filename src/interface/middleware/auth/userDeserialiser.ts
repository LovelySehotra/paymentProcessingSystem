import { JwtService } from '@/application/services';
import { IUser, User } from '@/domain/models';
import { RepositoryFactory } from '@/infrastructure';
import { NextFunction, Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';

// Extend Express Request interface
interface AuthenticatedRequest extends Request {
  user?: IUser ;
}

export const userDeserializer = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const jwtService = new JwtService();
  const accessToken = req.headers.authorization?.split('Bearer ')[1];

  if (!accessToken) return next();
  
  const payload = jwtService.decodeToken(accessToken);
  if (!payload || !payload.userId) return next();

  const userRepository = RepositoryFactory.createFull(User);
  const user = await userRepository.findById(payload.userId);
  
  if(!user) return next();
  
  (req as AuthenticatedRequest).user = user;
  return next();
});
