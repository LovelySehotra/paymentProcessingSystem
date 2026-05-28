import { Request, Response, NextFunction } from 'express';
import { instanceToPlain, plainToInstance, ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';
import { asyncHandler } from '@/utils/asyncHandler';
import { ValidationError } from '../error/error';

export const UseRequestDto = (dto: any) => {
  return asyncHandler(async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<any> => {
    if (!req.body) return next();

    // Convert plain object to DTO class instance for validation
    const dtoInstance = plainToInstance(dto, req.body, {
      excludeExtraneousValues: false,
    });

    // Validate the DTO instance
    const validationErrors = await validate(dtoInstance, {
      whitelist: true,
    });

    if (validationErrors?.length > 0) {
      throw new ValidationError(
        validationErrors.map(e => ({
          field: e.property,
          errors: Object.values(e.constraints || {}),
        }))
      );
    }

    // Convert back to plain object for the service layer
    req.body = instanceToPlain(dtoInstance);

    return next();
  });
};

/**
 * Normalizes any value to a plain JS object safe for class-transformer.
 * Handles Mongoose Documents, lean objects, arrays, and primitives.
 */
function toPlainObject(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map(toPlainObject);
  }

  if (typeof value === 'object') {
    // Handle Mongoose Documents (has toObject method)
    if (typeof (value as any).toObject === 'function') {
      return (value as any).toObject({ virtuals: false, versionKey: false });
    }
    return value;
  }

  return value;
}

/**
 * Applies DTO transformation to a value (single object or array of objects).
 * Pipeline: raw → toPlainObject → plainToInstance → instanceToPlain
 */
function applyDto<T>(dto: ClassConstructor<T>, value: unknown): unknown {
  const plain = toPlainObject(value);

  const instance = plainToInstance(dto, plain, {
    excludeExtraneousValues: true,  // strips non-@Expose() fields
    enableImplicitConversion: true, // handles type coercion (e.g., string → Date)
  });

  return instanceToPlain(instance, {
    excludeExtraneousValues: true,  // double-lock: also strip on serialization
  });
}

/**
 * Heuristic: an object "looks like an entity" if it has at least one
 * non-metadata key (not status/message/success/error).
 * Prevents transforming generic { message: 'Not found' } responses.
 */
function _looksLikeEntity(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
  const metaKeys = new Set(['status', 'message', 'success', 'error', 'code', 'timestamp']);
  return Object.keys(obj).some((k) => !metaKeys.has(k));
}

/**
 * Middleware factory that intercepts res.json() and applies DTO transformation.
 */
export const UseResponseDto = <T>(dto: ClassConstructor<T>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown): Response {
      try {
        if (body !== null && body !== undefined && typeof body === 'object') {
          const bodyObj = body as Record<string, unknown>;

          // Case 1: Wrapped response { data: ... }
          if ('data' in bodyObj && bodyObj.data !== undefined) {
            bodyObj.data = applyDto(dto, bodyObj.data);
            return originalJson(bodyObj);
          }

          // Case 2: Direct response - the body IS the entity/array
          if (Array.isArray(body) || _looksLikeEntity(body)) {
            return originalJson(applyDto(dto, body));
          }
        }
      } catch (err) {
        console.error('[UseResponseDto] Transformation failed:', err);
      }

      return originalJson(body);
    };

    next();
  };
};
