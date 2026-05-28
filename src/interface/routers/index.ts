import { Router} from "express";
import UserRouter from "./user.router";

const appRouter = Router();
appRouter.use("/users",UserRouter);
export {appRouter};