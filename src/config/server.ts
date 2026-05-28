import express from 'express';
import { appRouter } from '@/interface/routers';
import { Server as HttpServer } from 'http';
import { connectToDatabase, disconnectFromDatabase } from '@/infrastructure';

export type AppConfig = {
  port?: number | string;
};

export class Server {
  private app: express.Application;
  private config: AppConfig;
  private server?: HttpServer;
  constructor(config: AppConfig) {
    this.config = config;
    this.app = express();
    this.app.use(express.json());
    this.app.use('/api', appRouter);
    this.setupGracefulShutdown();
  }
  start() {
    const port = this.config.port ?? 1209;
    connectToDatabase();
    this.server = this.app.listen(port, () => {
      console.log(`🚀 Server is running on port ${port}`);
      console.log(`📡 API available at http://localhost:${port}/api`);
    });
    // console.log(this.server)
  }
  async stop(): Promise<void> {
    console.log('🔄 Shutting down server...');

    return new Promise(resolve => {
      if (this.server) {
        this.server.close(async err => {
          if (err) {
            console.error('❌ Error closing server:', err);
          } else {
            console.log('✅ HTTP server closed');
          }

          try {
            await disconnectFromDatabase();
            console.log('✅ Server shutdown complete');
            resolve();
          } catch (dbError) {
            console.error('❌ Error disconnecting from database:', dbError);
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
      console.log(`\n📨 Received ${signal}. Starting graceful shutdown...`);

      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    // Handle different termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', async error => {
      console.error('💥 Uncaught Exception:', error);
      await this.stop();
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      await this.stop();
      process.exit(1);
    });
  }
}
