import { Worker, Job, ConnectionOptions } from 'bullmq';
import mongoose from 'mongoose';

import { IPayment, Payment } from '@/domain/models/Payment';

import { logger } from '@/config/logger';
import { IRepository, RepositoryFactory } from '../repositories/GenericRepository';
import { QueueService } from '@/application/services/Queue/Queue.service';
import { getRedis } from '@/config/redis';
import { IPaymentEvent, PaymentEvent } from '@/domain/models';
import { CircuitBreaker } from '@/utils/circuit-breaker';
import { PaymentGatewayAdapter } from '../gateway/PaymentGatewayAdapter';

// 
// export const gatewayCircuitBreaker = new CircuitBreaker('payment-gateway', 3, 2, 10000);
// const paymentRepo = RepositoryFactory.createFull(Payment);

export class PaymentWorker {
  private worker: Worker;
  private paymentRepo: IRepository<IPayment>;
  private queueService: QueueService;
  private paymentEventRepo: IRepository<IPaymentEvent>;
  private gatewayCircuitBreaker: CircuitBreaker;
  private gatewayAdapter: PaymentGatewayAdapter;

  constructor() {
    this.paymentRepo = RepositoryFactory.createFull(Payment);
    this.queueService = new QueueService();
    this.paymentEventRepo = RepositoryFactory.createFull(PaymentEvent);
    this.gatewayCircuitBreaker = new CircuitBreaker('payment-gateway', 3, 2, 10000);
    this.gatewayAdapter = new PaymentGatewayAdapter();

    this.worker = new Worker(
      'payment-processing',
      async (job: Job<{ paymentId: string }>) => {
        const { paymentId } = job.data;
        const requestId = `job_${job.id}`;

        logger.info(`Worker picked up processing job for payment ${paymentId}`, { paymentId, requestId });

        try {
          const payment = await this.paymentRepo.withTransaction(async (session) => {
            const lockedPayment = await this.paymentRepo.findById(paymentId, { session });
            if (!lockedPayment) {
              logger.error(`Payment ${paymentId} not found in worker.`, { paymentId, requestId });
              return null;
            }

            if (
              lockedPayment.status === 'SUCCESS' ||
              (lockedPayment.status === 'FAILED' && lockedPayment.retryCount >= lockedPayment.maxRetries)
            ) {
              logger.info(`Payment ${paymentId} is already in terminal state ${lockedPayment.status}. Skipping.`, {
                paymentId,
                status: lockedPayment.status,
                requestId,
              });
              return null;
            }

            logger.info(`Transitioning payment ${paymentId} to PROCESSING`, { paymentId, requestId });

            const updated = await Payment.findByIdAndUpdate(
              paymentId,
              { status: 'PROCESSING' },
              { new: true, session }
            ).exec();

            await PaymentEvent.create(
              [
                {
                  paymentId: new mongoose.Types.ObjectId(paymentId),
                  fromStatus: lockedPayment.status,
                  toStatus: 'PROCESSING',
                  metadata: { description: `Worker started processing from ${lockedPayment.status}` },
                },
              ],
              { session }
            );

            return updated;
          });

          if (!payment) {
            return { status: 'skipped' };
          }

          let response;
          try {
            response = await this.gatewayCircuitBreaker.execute(async () => {
              return await this.gatewayAdapter.processPayment(
                paymentId,
                payment.amount,
                payment.currency
              );
            });
          } catch (gatewayErr: any) {
            await this.handlePaymentFailure(paymentId, gatewayErr);
            throw gatewayErr;
          }

          if (response.status === 'SUCCESS') {
            await this.paymentRepo.updateById(paymentId, {
              status: 'SUCCESS',
              externalReferenceId: response.externalReferenceId,
            });
            return { status: 'SUCCESS', referenceId: response.externalReferenceId };
          } else if (response.status === 'PENDING') {
            await Payment.findByIdAndUpdate(paymentId, {
              externalReferenceId: response.externalReferenceId,
            }).exec();
            logger.info(`Payment ${paymentId} processing pending webhook callback`, {
              paymentId,
              externalReferenceId: response.externalReferenceId,
              requestId,
            });
            return { status: 'PENDING', referenceId: response.externalReferenceId };
          }

          throw new Error(`Unexpected gateway status: ${response.status}`);
        } catch (err: any) {
          logger.error(`Error processing job for payment ${paymentId}: ${err.message}`, {
            paymentId,
            requestId,
            stack: err.stack,
          });
          throw err;
        }
      },
      {
        connection: getRedis(),
        concurrency: 5,
      }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Job ${job?.id} completed successfully.`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Job ${job?.id} failed: ${err.message}`);
    });
  }

  private async handlePaymentFailure(paymentId: string, err: Error): Promise<void> {
    // const isRetryable = err instanceof GatewayError ? err.isRetryable : false;
    const isRetryable = true; // For demonstration, treat all errors as retryable. Adjust based on actual error types.
    const failureReason = err.message || 'Unknown gateway failure';

    await this.paymentRepo.withTransaction(async (session) => {
      const payment = await this.paymentRepo.findById(paymentId, { session });
      if (!payment) return;

      const currentRetry = payment.retryCount;
      const maxRetries = payment.maxRetries;

      if (isRetryable && currentRetry < maxRetries) {
        const nextRetry = currentRetry + 1;

        await this.paymentRepo.updateById(
          paymentId,
          {
            status: 'RETRYING',
            retryCount: nextRetry,
            failureReason,
          },
          { session }
        )

        await this.paymentEventRepo.create(
          {
            paymentId: new mongoose.Types.ObjectId(paymentId),
            fromStatus: 'PROCESSING',
            toStatus: 'RETRYING',
            metadata: {
              description: `Retryable failure: ${failureReason}. Attempt ${nextRetry}/${maxRetries}`,
              error: failureReason,
              attempt: nextRetry,
            },
          },
          { session }
        );
      } else {
        await this.paymentRepo.updateById(
          paymentId,
          {
            status: 'FAILED',
            failureReason,
          },
          { session }
        )

        await this.paymentEventRepo.create(

          {
            paymentId: new mongoose.Types.ObjectId(paymentId),
            fromStatus: 'PROCESSING',
            toStatus: 'FAILED',
            metadata: {
              description: isRetryable
                ? `Max retries (${maxRetries}) exhausted. Final failure: ${failureReason}`
                : `Non-retryable failure: ${failureReason}`,
              error: failureReason,
            },
          },

          { session }
        );
      }
    });

    const updated = await Payment.findById(paymentId).exec();
    if (updated && updated.status === 'RETRYING') {
      const delayMs = Math.pow(2, updated.retryCount) * 1000;
      await this.queueService.addPaymentJob(paymentId, delayMs);
    }
  }

  public async close(): Promise<void> {
    await this.worker.close();
  }
}


