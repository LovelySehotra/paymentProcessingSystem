import { Router } from "express";
import { paymentRouter } from "./payment.router";
import { webhookRouter } from "./webhook.router";

const appRouter = Router();
appRouter.use("/payment", paymentRouter);
appRouter.use("/webhooks", webhookRouter);
export { appRouter };