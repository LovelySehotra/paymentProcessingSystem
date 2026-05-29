import express from 'express';
import { appRouter } from '@/interface/routers';
import { Server as HttpServer } from 'http';
import { connectToDatabase, disconnectFromDatabase } from '@/infrastructure';
import { PaymentWorker } from '@/infrastructure/workers/PaymentWorker';
import logger from './logger';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './swagger.config';

export type AppConfig = {
  port?: number | string;
};

export class Server {
  private app: express.Application;
  private config: AppConfig;
  private server?: HttpServer;
  private paymentWorker: PaymentWorker;
  constructor(config: AppConfig) {
    this.config = config;
    this.paymentWorker = new PaymentWorker();
    this.app = express();
    this.app.use(express.json());
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))
    this.app.use('/api', appRouter);
    this.setupGracefulShutdown();
  }
  start() {
    const port = this.config.port ?? 1209;
    connectToDatabase();

    this.server = this.app.listen(port, () => {
      console.log(` Server is running on port ${port}`);
      console.log(` API available at http://localhost:${port}/api`);
    });

  }
  async stop(): Promise<void> {
    console.log(' Shutting down server...');

    return new Promise(resolve => {
      if (this.server) {
        this.server.close(async err => {
          if (err) {
            console.error(' Error closing server:', err);
          } else {
            console.log('HTTP server closed');
          }

          try {
            await disconnectFromDatabase();
            console.log(' Server shutdown complete');
            resolve();
          } catch (dbError) {
            console.error('Error disconnecting from database:', dbError);
            resolve(); // Still resolve to allow process to exit
          }
        });
      } else {
        resolve();
      }
    });
  }
  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

      try {
        if (this.paymentWorker) {
          logger.info('Stopping BullMQ worker...');
          await this.paymentWorker.close();
          logger.info('BullMQ worker stopped.');
        }
        await this.stop();
        process.exit(0);
      } catch (error) {
        console.error(' Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    // Handle different termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', async error => {
      console.error('Uncaught Exception:', error);
      await this.stop();
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      await this.stop();
      process.exit(1);
    });
  }
}
