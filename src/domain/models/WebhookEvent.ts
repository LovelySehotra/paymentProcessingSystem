import { Schema, Document, model } from 'mongoose';

export interface IWebhookEvent extends Document {
  externalReferenceId: string;
  eventType: string;
  payload: any;
  processed: boolean;
  processedAt?: Date;
  createdAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>({
  externalReferenceId: { type: String, required: true, index: true },
  eventType: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  processed: { type: Boolean, default: false, required: true },
  processedAt: { type: Date }
}, { timestamps: { createdAt: true, updatedAt: false } });

// Compound unique index for idempotency
WebhookEventSchema.index({ externalReferenceId: 1, eventType: 1 }, { unique: true });

export const WebhookEvent = model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);
