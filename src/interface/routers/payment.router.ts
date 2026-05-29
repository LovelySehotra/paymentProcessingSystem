import { Router } from 'express';
import { PaymentController } from '@/interface/controllers/payment.controller';
import { UseRequestDto, UseResponseDto } from '@/interface/middleware/dtos/validation';
import { CreatePaymentDto, PaymentResponseDto } from '@/application/dtos/Payment/payment.dto';
import { idempotencyMiddleware } from '@/interface/middleware/idempotency/idempotency';
import { PaymentService } from '@/application/services';
import { RepositoryFactory } from '@/infrastructure/repositories/GenericRepository';
import { Payment } from '@/domain/models/Payment';

const router = Router();
const paymentRepo = RepositoryFactory.createFull(Payment);
const paymentService = new PaymentService(paymentRepo);
const paymentController = new PaymentController(paymentService);


router.post(
  '/',
  idempotencyMiddleware,
  UseRequestDto(CreatePaymentDto),
  UseResponseDto(PaymentResponseDto),
  paymentController.create
);

router.get(
  '/:id',
  UseResponseDto(PaymentResponseDto),
  paymentController.get
);

router.post(
  '/:id/retry',
  paymentController.retry
);

export const paymentRouter = router;
