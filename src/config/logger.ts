import pino from "pino";
import { ENV } from "@/config";

const streams = [{ stream: process.stdout }];

export const Logger = pino(
    {
        level: ENV === "PROD" ? "error" : "info",
    },
    pino.multistream(streams)
);