import crypto from 'crypto';
import fetch from 'node-fetch';
import { GatewayError } from '@/interface/middleware/error/error';
import { logger } from '@/config/logger';
import { GATEWAY_DELAYED_WEBHOOK_PROBABILITY, GATEWAY_HARD_FAILURE_PROBABILITY, GATEWAY_SUCCESS_PROBABILITY, GATEWAY_TEMPORARY_FAILURE_PROBABILITY, GATEWAY_TIMEOUT_PROBABILITY, WEBHOOK_SECRET, WEBHOOK_URL } from '@/config';

export interface GatewayResponse {
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  externalReferenceId: string;
  failureReason?: string;
}

export class PaymentGatewayAdapter {
  private readonly successProb: number;
  private readonly tempFailProb: number;
  private readonly hardFailProb: number;
  private readonly timeoutProb: number;
  private readonly delayedWebhookProb: number;
  private readonly webhookUrl: string;
  private readonly webhookSecret: string;

  constructor() {
    this.successProb = Number(GATEWAY_SUCCESS_PROBABILITY);
    this.tempFailProb = Number(GATEWAY_TEMPORARY_FAILURE_PROBABILITY);
    this.hardFailProb = Number(GATEWAY_HARD_FAILURE_PROBABILITY);
    this.timeoutProb = Number(GATEWAY_TIMEOUT_PROBABILITY);
    this.delayedWebhookProb = Number(GATEWAY_DELAYED_WEBHOOK_PROBABILITY);
    this.webhookUrl =  WEBHOOK_URL!;
    this.webhookSecret = WEBHOOK_SECRET!;

    const sum = this.successProb + this.tempFailProb + this.hardFailProb + this.timeoutProb + this.delayedWebhookProb;
    if (Math.abs(sum - 1.0) > 0.001) {
      logger.warn(`Gateway probabilities sum up to ${sum} instead of 1.0. Normalizing...`);
    }
  }

  public async processPayment(paymentId: string, amount: number, currency: string): Promise<GatewayResponse> {
    const externalReferenceId = `tx_${crypto.randomUUID()}`;
    const rand = Math.random();

    logger.info(`Sending payment ${paymentId} to external gateway. Reference: ${externalReferenceId}`, {
      paymentId,
      amount,
      currency,
      rand,
    });

    // 1. Timeout Simulation (Default: 5%)
    if (rand < this.timeoutProb) {
      logger.warn(`Gateway Timeout simulated for payment ${paymentId}`, { paymentId });
      await new Promise((resolve) => setTimeout(resolve, 1500));
      throw new GatewayError('Gateway connection timed out.', true);
    }

    // 2. Temporary Failure Simulation (Default: 10%)
    const tempFailLimit = this.timeoutProb + this.tempFailProb;
    if (rand >= this.timeoutProb && rand < tempFailLimit) {
      logger.warn(`Gateway Temporary Failure simulated for payment ${paymentId}`, { paymentId });
      throw new GatewayError('Internal gateway error (503 Service Unavailable).', true);
    }

    // 3. Hard Failure Simulation (Default: 10%)
    const hardFailLimit = tempFailLimit + this.hardFailProb;
    if (rand >= tempFailLimit && rand < hardFailLimit) {
      logger.warn(`Gateway Hard Failure simulated for payment ${paymentId}`, { paymentId });
      throw new GatewayError('Card declined: Insufficient funds.', false);
    }

    // 4. Delayed Webhook Callback Simulation (Default: 5%)
    const delayedLimit = hardFailLimit + this.delayedWebhookProb;
    if (rand >= hardFailLimit && rand < delayedLimit) {
      logger.info(`Gateway Delayed Webhook Callback scheduled for payment ${paymentId}`, { paymentId });
      this.scheduleWebhookCallback(externalReferenceId, paymentId, amount, currency);
      return {
        status: 'PENDING',
        externalReferenceId,
      };
    }

    // 5. Success (Remaining %)
    logger.info(`Gateway Success simulated for payment ${paymentId}`, { paymentId, externalReferenceId });
    return {
      status: 'SUCCESS',
      externalReferenceId,
    };
  }

  private scheduleWebhookCallback(
    externalReferenceId: string,
    paymentId: string,
    amount: number,
    currency: string
  ): void {
    setTimeout(async () => {
      try {
        const outcome = Math.random() > 0.15 ? 'SUCCESS' : 'FAILED';
        const payload = {
          event: 'payment.updated',
          data: {
            paymentId,
            externalReferenceId,
            status: outcome,
            amount,
            currency,
            failureReason: outcome === 'FAILED' ? 'Gateway processing failure' : undefined,
          },
        };

        const bodyString = JSON.stringify(payload);
        const signature = crypto
          .createHmac('sha256', this.webhookSecret)
          .update(bodyString)
          .digest('hex');

        logger.info(`Executing simulated webhook callback for payment ${paymentId}`, {
          paymentId,
          externalReferenceId,
          outcome,
        });

        const response = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Gateway-Signature': signature,
          },
          body: bodyString,
        });

        if (!response.ok) {
          logger.error(`Simulated webhook callback failed with HTTP status ${response.status}`, {
            paymentId,
            externalReferenceId,
          });
        } else {
          logger.info(`Simulated webhook callback successful`, { paymentId, externalReferenceId });
        }
      } catch (err: any) {
        logger.error(`Error sending simulated webhook callback: ${err.message}`, { paymentId, externalReferenceId });
      }
    }, 3000);
  }
}

export const gatewayAdapter = new PaymentGatewayAdapter();
