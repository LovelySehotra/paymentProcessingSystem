import { PaymentService } from '@/application/services';
import { Request, Response } from 'express';


export class PaymentController {
    private paymentService: PaymentService;

    constructor(paymentService: PaymentService) {
        this.paymentService = paymentService;
    }

    create = async (req: Request, res: Response): Promise<Response> => {
        const idempotencyKey = req.header('Idempotency-Key')!;
        const { amount, currency } = req.body;

        const payment = await this.paymentService.createPayment({
            amount,
            currency,
            idempotencyKey,
        });

        return res.status(201).json(payment);
    };

    get = async (req: Request, res: Response): Promise<Response> => {
        const { id } = req.params;
        const payment = await this.paymentService.getPaymentById(id);
        return res.status(200).json(payment);
    };

    retry = async (req: Request, res: Response): Promise<Response> => {
        const { id } = req.params;
        const payment = await this.paymentService.retryPayment(id);
        return res.status(200).json({
            message: 'Payment retry initiated.',
            id: payment._id,
            status: payment.status,
        });
    };
}
