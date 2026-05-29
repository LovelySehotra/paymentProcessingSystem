import { Schema, Document, model } from 'mongoose';

export interface IIdempotencyKey extends Document {
  key: string;
  requestPath: string;
  requestBody: any;
  responseStatus: number;
  responseBody: any;
  createdAt: Date;
  expiresAt: Date;
}

const IdempotencyKeySchema = new Schema<IIdempotencyKey>({
  key: { type: String, required: true, unique: true, index: true },
  requestPath: { type: String, required: true },
  requestBody: { type: Schema.Types.Mixed, required: true },
  responseStatus: { type: Number, required: true },
  responseBody: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now, required: true },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

// Create TTL index on expiresAt
IdempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const IdempotencyKey = model<IIdempotencyKey>('IdempotencyKey', IdempotencyKeySchema);
