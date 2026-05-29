import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
export const { PORT,
    DATABASE_URL,
    JWT_SECRET,
    ENV,
    REDIS_HOST,
    REDIS_PORT,
    REDIS_PASSWORD, 
    NODE_ENV,
    GATEWAY_SUCCESS_PROBABILITY,
    GATEWAY_TEMPORARY_FAILURE_PROBABILITY,
    GATEWAY_HARD_FAILURE_PROBABILITY,
    GATEWAY_TIMEOUT_PROBABILITY,
    GATEWAY_DELAYED_WEBHOOK_PROBABILITY,
    WEBHOOK_URL,
    WEBHOOK_SECRET
 } = process.env;
