import { Router } from 'express';
import { WebhookController } from '@/interface/controllers/webhook.controller';
import { RepositoryFactory } from '@/infrastructure/repositories/GenericRepository';
import { Payment } from '@/domain/models';
import { WebhookService } from '@/application/services/Webhook/WebhookService';

const router = Router();
const paymentRepo = RepositoryFactory.createFull(Payment);
const webhookService = new WebhookService(paymentRepo);
const webhookController = new WebhookController(webhookService);

router.post('/', webhookController.handle);

export const webhookRouter = router;
