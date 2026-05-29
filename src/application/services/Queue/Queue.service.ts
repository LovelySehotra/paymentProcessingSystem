import { REDIS_HOST, REDIS_PORT } from '@/config';
import { logger } from '@/config/logger';
import { getRedis } from '@/config/redis';
import { Queue, ConnectionOptions } from 'bullmq';



export class QueueService {
  private paymentQueue: Queue;

  constructor() {
    this.paymentQueue = new Queue('payment-processing', {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    this.paymentQueue.on('error', (err:any) => {
    logger.error(`BullMQ Payment Queue Error: ${err.message}`, { error: err });
    });
  }

  public async addPaymentJob(paymentId: string, delayMs = 0): Promise<void> {
    logger.info(`Adding payment job to queue. Payment ID: ${paymentId}, Delay: ${delayMs}ms`, {
      paymentId,
      delayMs,
    });

    await this.paymentQueue.add(
      'process-payment',
      { paymentId },
      {
        delay: delayMs,
        jobId: `job_${paymentId}`,
      }
    );
  }

  public async close(): Promise<void> {
    await this.paymentQueue.close();
  }
}

export const queueService = new QueueService();
