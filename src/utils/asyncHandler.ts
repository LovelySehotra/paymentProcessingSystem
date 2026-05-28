import { Request, Response, NextFunction, RequestHandler } from 'express';


export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler => 
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };


export const socketAsyncHandler = (fn: (payload: any, callback: (response: any) => void) => Promise<any>) => 
  async (payload: any, callback: (response: any) => void) => {
    try {
      await fn(payload, callback);
    } catch (error: any) {
      console.error('Socket error:', error);
      if (callback && typeof callback === 'function') {
        callback({ 
          status: 'error', 
          error: error.message || 'Internal Server Error' 
        });
      }
    }
  };
