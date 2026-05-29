import { IWebhookEvent, WebhookEvent } from '@/domain/models/WebhookEvent';
import { IPayment, Payment } from '@/domain/models/Payment';
import { PaymentEvent } from '@/domain/models/PaymentEvent';
import { NotFoundError } from '@/interface/middleware/error/error';
import { logger } from '@/config/logger';
import { IRepository } from '@/infrastructure/repositories/GenericRepository';

export class WebhookService {
  private paymentRepo: IRepository<IPayment>;
  private webhookEventRepo: IRepository<IWebhookEvent>;
  constructor(paymentRepo: IRepository<IPayment>, webhookEventRepo: IRepository<IWebhookEvent>) {
    this.paymentRepo = paymentRepo;
    this.webhookEventRepo = webhookEventRepo;
  }
  public async processWebhook(payload: {
    event: string;
    data: {
      paymentId: string;
      externalReferenceId: string;
      status: 'SUCCESS' | 'FAILED';
      amount: number;
      currency: string;
      failureReason?: string;
    };
  }): Promise<void> {
    const { paymentId, externalReferenceId, status: webhookStatus, failureReason } = payload.data;
    const eventType = payload.event;

    logger.info(`Received webhook processing request for payment ${paymentId}`, {
      paymentId,
      externalReferenceId,
      webhookStatus,
    });

    // 1. Store webhook event for auditing & idempotency
    try {
      await this.webhookEventRepo.create({
        externalReferenceId,
        eventType,
        payload,
        processed: false,
      });
    } catch (err: any) {
      if (err.code === 11000) {
        logger.info(`Webhook event already registered for reference: ${externalReferenceId}, event: ${eventType}. Ignoring duplicate callback.`, {
          externalReferenceId,
          eventType,
        });
        return;
      }
      throw err;
    }

    // 2. Lock payment row & update status (in a database transaction)
    await this.paymentRepo.withTransaction(async (session) => {
      let payment = await this.paymentRepo.findById(paymentId, {session});

      if (!payment) {
        payment = await this.paymentRepo.findOne( {externalReferenceId}, {session});
      }

      if (!payment) {
        logger.error(`Webhook received for unknown payment: id=${paymentId}, ref=${externalReferenceId}`, {
          paymentId,
          externalReferenceId,
        });
        throw new NotFoundError(`Payment not found for ID ${paymentId} or reference ${externalReferenceId}`);
      }

      const currentStatus = payment.status;

      // Rule: SUCCESS is terminal. Ignore webhook status update.
      if (currentStatus === 'SUCCESS') {
        logger.info(`Webhook ignored. Payment ${payment._id} is already SUCCESS.`, {
          paymentId: payment._id,
          currentStatus,
        });
        return;
      }

      // Rule: FAILED cannot be overridden by webhook unless we are retrying.
      if (currentStatus === 'FAILED') {
        logger.info(`Webhook ignored. Payment ${payment._id} is already FAILED.`, {
          paymentId: payment._id,
          currentStatus,
        });
        return;
      }

      const nextStatus = webhookStatus === 'SUCCESS' ? 'SUCCESS' : 'FAILED';

      const updateData: any = {
        status: nextStatus,
        externalReferenceId,
      };

      if (webhookStatus === 'FAILED') {
        updateData.failureReason = failureReason || 'Gateway webhook indicated failure';
      }

      await Payment.findByIdAndUpdate(payment._id, updateData, { session }).exec();

      await PaymentEvent.create(
        [
          {
            paymentId: payment._id,
            fromStatus: currentStatus,
            toStatus: nextStatus,
            metadata: {
              description: `Webhook event (${eventType}) updated payment status to ${nextStatus}`,
              webhookPayload: payload,
            },
          },
        ],
        { session }
      );

      await this.webhookEventRepo.updateOne(
        { externalReferenceId, eventType },
        { processed: true, processedAt: new Date() },
        { session }
      );

      logger.info(`Webhook successfully processed for payment ${payment._id}. Status changed to ${nextStatus}`, {
        paymentId: payment._id,
        from: currentStatus,
        to: nextStatus,
      });
    });
  }
}


