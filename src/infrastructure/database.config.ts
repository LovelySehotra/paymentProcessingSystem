import mongoose from 'mongoose';
import { DATABASE_URL, ENV } from '@/config';

/**
 * Establishes connection to MongoDB database
 * @returns {Promise<void>} Promise that resolves when connection is established
 * @throws {Error} Throws error if connection fails
 */
export const connectToDatabase = async () => {
  try {
    // Set mongoose connection options for better performance and reliability
    const connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
    };

    const connectionString = DATABASE_URL || 'mongodb://127.0.0.1:27017/lms';

    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }

    const { connection } = await mongoose.connect(
      connectionString,
      connectionOptions,
    );

    if (connection.readyState === 1) {
      console.log(`Successfully connected to MongoDB`);
      console.log(`Host: ${connection.host}`);
      console.log(`Database: ${connection.name}`);
    }

    // Handle connection events
    connection.on('error', error => {
      console.error('MongoDB connection error:', error);
    });

    connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });

    connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed through app termination');
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);

    // Log additional error details in development
    if (ENV === 'development') {
      console.error('Full error details:', error);
    }

    // Exit with error code
    process.exit(1);
  }
};

/**
 * Gracefully closes the database connection
 * @returns {Promise<void>} Promise that resolves when connection is closed
 */
export const disconnectFromDatabase = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed successfully');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error.message);
    throw error;
  }
};
