
import { IPayment } from '@/domain/models/Payment';
import { queueService } from '@/infrastructure/queue/QueueService';
import { NotFoundError, AppError } from '@/interface/middleware/error/error';
import { IRepository } from '@/infrastructure/repositories/GenericRepository';
import { QueueService } from '../Queue/Queue.service';

export class PaymentService {
  private paymentRepo: IRepository<IPayment>;
  private queueService: QueueService;

  constructor(paymentRepo: IRepository<IPayment>) {
    this.paymentRepo = paymentRepo;
    this.queueService= new QueueService();
  }

  public async createPayment(data: {
    amount: number;
    currency: string;
    idempotencyKey: string;
  }): Promise<IPayment> {
  
    const payment = await this.paymentRepo.create(data);
    if (!payment) {
      throw new AppError('Failed to create payment', 500);
    }
    // Queue asynchronous processing
    await this.queueService.addPaymentJob(payment._id!.toString());
    return payment;
  }

  public async getPaymentById(id: string): Promise<IPayment> {
    const payment = await this.paymentRepo.findById(id);
    if (!payment) {
      throw new NotFoundError(`Payment with ID ${id} not found.`);
    }
    return payment;
  }

  public async retryPayment(id: string): Promise<IPayment> {
    const payment = await this.paymentRepo.findById(id);
    if (!payment) {
      throw new NotFoundError(`Payment with ID ${id} not found.`);
    }

    if (payment.status !== 'FAILED') {
      throw new AppError(`Payment ${id} is in status ${payment.status} and cannot be manually retried.`, 400);
    }

    // Transition: FAILED -> RETRYING
    // Reset retry count so that the payment gets a fresh set of attempts
    const updatedPayment = await this.paymentRepo.updateOne({ _id: id }, {
      status: 'RETRYING',
      retryCount: 0,
      failureReason: null,
    });
    if (!updatedPayment) {
      throw new AppError(`Failed to update payment ${id} to RETRYING`, 500);
    }
    // Queue the processing job
    await queueService.addPaymentJob(id);

    return updatedPayment;
  }
}
