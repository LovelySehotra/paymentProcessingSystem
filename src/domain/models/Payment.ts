import { Schema, Document, model } from 'mongoose';

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'RETRYING';

export interface IPayment extends Document {
  amount: number;
  currency: string;
  status: PaymentStatus;
  idempotencyKey: string;
  externalReferenceId?: string;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  amount: { type: Number, required: true },
  currency: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'RETRYING'],
    default: 'PENDING',
    required: true
  },
  idempotencyKey: { type: String, required: true, unique: true, index: true },
  externalReferenceId: { type: String, unique: true, sparse: true },
  failureReason: { type: String },
  retryCount: { type: Number, default: 0, required: true },
  maxRetries: { type: Number, default: 3, required: true }
}, { timestamps: true });

export const Payment = model<IPayment>('Payment', PaymentSchema);
