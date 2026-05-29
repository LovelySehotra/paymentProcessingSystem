import mongoose, { Schema, Document, model } from 'mongoose';
import { PaymentStatus } from './Payment';

export interface IPaymentEvent extends Document {
  paymentId: mongoose.Types.ObjectId;
  fromStatus: PaymentStatus;
  toStatus: PaymentStatus;
  metadata?: any;
  createdAt: Date;
}

const PaymentEventSchema = new Schema<IPaymentEvent>({
  paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
  fromStatus: { type: String, enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'RETRYING'], required: true },
  toStatus: { type: String, enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'RETRYING'], required: true },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, required: true }
});

export const PaymentEvent = model<IPaymentEvent>('PaymentEvent', PaymentEventSchema);
