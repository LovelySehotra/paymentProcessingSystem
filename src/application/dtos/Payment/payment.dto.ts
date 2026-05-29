import { IsString, IsNotEmpty, IsNumber, IsPositive, Length, Matches } from 'class-validator';
import { Expose, Transform } from 'class-transformer';

export class CreatePaymentDto {
  @IsNumber()
  @IsPositive({ message: 'Amount must be greater than 0' })
  @IsNotEmpty()
  amount!: number;

  @IsString()
  @Length(3, 3, { message: 'Currency must be a 3-character ISO code' })
  @Matches(/^[A-Z]{3}$/, { message: 'Currency must be 3 uppercase letters' })
  @IsNotEmpty()
  currency!: string;
}

export class PaymentResponseDto {
  @Expose()
  @Transform(({ obj }) => (obj._id ? obj._id.toString() : obj.id))
  id!: string;

  @Expose()
  amount!: number;

  @Expose()
  currency!: string;

  @Expose()
  status!: string;

  @Expose()
  idempotencyKey!: string;


  @Expose()
  failureReason?: string;

  @Expose()
  retryCount!: number;

  @Expose()
  maxRetries!: number;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
