import { GatewayError } from '@/interface/middleware/error/error';
import { logger } from '@/config/logger';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private nextAttemptTime = 0;

  // Configuration
  private readonly failureThreshold: number;
  private readonly recoveryThreshold: number;
  private readonly cooldownMs: number;
  private readonly name: string;

  constructor(
    name: string,
    failureThreshold = 3,
    recoveryThreshold = 2,
    cooldownMs = 10000 // 10 seconds cooldown
  ) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.recoveryThreshold = recoveryThreshold;
    this.cooldownMs = cooldownMs;
  }

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.checkState();

    if (this.state === CircuitState.OPEN) {
      logger.warn(`[CircuitBreaker:${this.name}] Call blocked. State is OPEN.`, { state: this.state });
      throw new GatewayError('Circuit Breaker is OPEN. Gateway is temporarily unavailable.', true);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err: any) {
      this.onFailure(err);
      throw err;
    }
  }

  private checkState(): void {
    if (this.state === CircuitState.OPEN && Date.now() >= this.nextAttemptTime) {
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
      logger.info(`[CircuitBreaker:${this.name}] Cooldown completed. Transitioning to HALF_OPEN.`);
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      logger.info(`[CircuitBreaker:${this.name}] Successful request in HALF_OPEN. Progress: ${this.successCount}/${this.recoveryThreshold}`);
      if (this.successCount >= this.recoveryThreshold) {
        this.state = CircuitState.CLOSED;
        logger.info(`[CircuitBreaker:${this.name}] Circuit CLOSED. System healthy.`);
      }
    }
  }

  private onFailure(err: any): void {
    // Only count gateway errors or timeouts as circuit breaker failures
    const isRetryable = err instanceof GatewayError && err.isRetryable;

    if (!isRetryable) {
      // Non-retryable errors (e.g. invalid request, validation failure, insufficient funds) shouldn't trip circuit breaker
      return;
    }

    this.failureCount++;
    logger.warn(`[CircuitBreaker:${this.name}] Request failed. Failure count: ${this.failureCount}/${this.failureThreshold}`, {
      state: this.state,
      error: err.message,
    });

    if (this.state === CircuitState.CLOSED && this.failureCount >= this.failureThreshold) {
      this.trip();
    } else if (this.state === CircuitState.HALF_OPEN) {
      this.trip();
    }
  }

  private trip(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + this.cooldownMs;
    logger.error(`[CircuitBreaker:${this.name}] Circuit tripped to OPEN. Cooldown until ${new Date(this.nextAttemptTime).toISOString()}`);
  }

  public getState(): CircuitState {
    this.checkState();
    return this.state;
  }

  public reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = 0;
    logger.info(`[CircuitBreaker:${this.name}] Reset to CLOSED.`);
  }
}
