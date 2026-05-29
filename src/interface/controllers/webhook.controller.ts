import { Request, Response } from 'express';
import crypto from 'crypto';
import { WebhookService } from '@/application/services/Webhook/WebhookService';

import { logger } from '@/config/logger';
import { WEBHOOK_SECRET } from '@/config';

export class WebhookController {
  private webhookService: WebhookService;

  constructor(webhookService: WebhookService) {
    this.webhookService = webhookService;
  }

  public handle = async (req: Request, res: Response): Promise<Response> => {
    const signature = req.header('X-Gateway-Signature');
    const requestId = req.requestId || 'unknown';

    if (!signature) {
      logger.warn('Webhook request received without signature', { requestId });
      return res.status(401).json({ message: 'Missing gateway signature header.' });
    }

    const payloadString = JSON.stringify(req.body);
    const computedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET!)
      .update(payloadString)
      .digest('hex');

    const sigBuffer = Buffer.from(signature, 'utf-8');
    const compBuffer = Buffer.from(computedSignature, 'utf-8');

    let isSignatureValid = false;
    if (sigBuffer.length === compBuffer.length) {
      isSignatureValid = crypto.timingSafeEqual(sigBuffer, compBuffer);
    }

    if (!isSignatureValid) {
      logger.warn('Invalid signature for webhook payload', { requestId, signature, computedSignature });
      return res.status(401).json({ message: 'Invalid gateway signature.' });
    }

    await this.webhookService.processWebhook(req.body);

    return res.status(200).json({ received: true });
  };
}
