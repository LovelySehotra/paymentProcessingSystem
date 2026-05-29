import { Router} from "express";
import { paymentRouter } from "./payment.router";

const appRouter = Router();
appRouter.use("/payment", paymentRouter);
export {appRouter};