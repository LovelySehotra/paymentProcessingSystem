import pino from 'pino';
import { NODE_ENV } from './env.config';

const transport = NODE_ENV === 'development'
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    }
  : undefined;

const baseLogger = pino({
  level:  'info',
  transport,
});

export const logger = {
  info(msg: string, obj?: any) {
    if (obj) baseLogger.info(obj, msg);
    else baseLogger.info(msg);
  },
  error(msg: string, obj?: any) {
    if (obj) baseLogger.error(obj, msg);
    else baseLogger.error(msg);
  },
  warn(msg: string, obj?: any) {
    if (obj) baseLogger.warn(obj, msg);
    else baseLogger.warn(msg);
  },
  debug(msg: string, obj?: any) {
    if (obj) baseLogger.debug(obj, msg);
    else baseLogger.debug(msg);
  },
  trace(msg: string, obj?: any) {
    if (obj) baseLogger.trace(obj, msg);
    else baseLogger.trace(msg);
  },
};
export type Logger = typeof logger;
export default logger;
