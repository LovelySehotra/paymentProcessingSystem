import { Request, Response, NextFunction } from 'express';
import { IdempotencyKey } from '@/domain/models/IdempotencyKey';
import { BadRequestError, ConflictError } from '@/interface/middleware/error/error';
import { logger } from '@/config/logger';

export async function idempotencyMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.method !== 'POST') {
    return next();
  }

  const key = req.header('Idempotency-Key');
  if (!key) {
    return next(new BadRequestError("Missing 'Idempotency-Key' request header."));
  }

  const requestId = req.requestId || 'unknown';
  const requestPath = req.originalUrl;
  const requestBody = req.body;

  try {
    const existing = await IdempotencyKey.findOne({ key }).exec();

    if (existing) {
      const requestBodyMatches = JSON.stringify(existing.requestBody) === JSON.stringify(requestBody);
      if (!requestBodyMatches || existing.requestPath !== requestPath) {
        return next(new BadRequestError("Idempotency-Key shared with a different request payload or path."));
      }

      if (existing.responseStatus === 0) {
        return next(new ConflictError("A request with this Idempotency-Key is already in progress."));
      }

      logger.info(`Idempotent cache hit for key ${key}`, { requestId, key });
      res.status(existing.responseStatus).json(existing.responseBody);
      return;
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await IdempotencyKey.create({
      key,
      requestPath,
      requestBody,
      responseStatus: 0,
      responseBody: {},
      expiresAt,
    });

    const originalSend = res.send;

    res.send = function (body): Response {
      res.send = originalSend;

      let parsedBody: any = {};
      try {
        parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
      } catch (err) {
        parsedBody = { raw: body };
      }

      const statusCode = res.statusCode;

      if (statusCode >= 500) {
        IdempotencyKey.deleteOne({ key }).catch((err) => {
          logger.error(`Failed to delete idempotency key for 5xx response: ${err.message}`, { key, requestId });
        });
      } else {
        IdempotencyKey.updateOne(
          { key },
          {
            responseStatus: statusCode,
            responseBody: parsedBody,
          }
        ).catch((err) => {
          logger.error(`Failed to cache response for idempotency key: ${err.message}`, { key, requestId });
        });
      }

      return originalSend.call(this, body);
    };

    next();
  } catch (err: any) {
    logger.error(`Idempotency middleware error: ${err.message}`, { requestId, key });
    next(err);
  }
}
