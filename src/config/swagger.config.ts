export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Payment Processing System API',
    version: '1.0.0',
    description: 'Production-grade, highly available payment processing system using Node.js, Express, MongoDB, Redis, and BullMQ.',
  },
  servers: [
    {
      url: 'http://localhost:1209/api',
      description: 'Development Server',
    },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Check the health status of the application and its downstream services',
        description: 'Verifies MongoDB database connectivity and Redis connection health.',
        responses: {
          200: {
            description: 'System is healthy and fully operational',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'UP' },
                    timestamp: { type: 'string', example: '2026-05-29T00:00:00.000Z' },
                    services: {
                      type: 'object',
                      properties: {
                        database: { type: 'string', example: 'HEALTHY' },
                        redis: { type: 'string', example: 'HEALTHY' },
                      },
                    },
                  },
                },
              },
            },
          },
          503: {
            description: 'One or more services are unhealthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'DOWN' },
                    timestamp: { type: 'string', example: '2026-05-29T00:00:00.000Z' },
                    services: {
                      type: 'object',
                      properties: {
                        database: { type: 'string', example: 'UNHEALTHY' },
                        redis: { type: 'string', example: 'HEALTHY' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/payment': {
      post: {
        summary: 'Initialize a new payment request',
        description: 'Creates a payment in PENDING state and queues it for asynchronous processing. Enforces idempotency via the Idempotency-Key header.',
        parameters: [
          {
            name: 'Idempotency-Key',
            in: 'header',
            required: true,
            schema: {
              type: 'string',
            },
            description: 'Unique key to identify this request and prevent duplicate processing.',
            example: '70db82aa-36a2-4ee5-ba2d-f2f3ca8a386f',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount', 'currency'],
                properties: {
                  amount: {
                    type: 'number',
                    minimum: 0.01,
                    description: 'The payment amount (must be positive)',
                    example: 50.00,
                  },
                  currency: {
                    type: 'string',
                    length: 3,
                    description: '3-letter ISO currency code (e.g. USD, EUR, GBP)',
                    example: 'USD',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Payment initialized successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', pattern: '^[0-9a-fA-F]{24}$', example: '6a195938e43bdb09e0b5e909' },
                    amount: { type: 'number', example: 50.00 },
                    currency: { type: 'string', example: 'USD' },
                    status: { type: 'string', example: 'PENDING' },
                    createdAt: { type: 'string', format: 'date-time', example: '2026-05-29T16:15:00.000Z' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Invalid input payload or mismatched Idempotency-Key request details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Invalid request payload' },
                    errors: {
                      type: 'object',
                      properties: {
                        amount: { type: 'array', items: { type: 'string' }, example: ['Amount must be greater than 0'] },
                      },
                    },
                  },
                },
              },
            },
          },
          409: {
            description: 'Idempotency conflict (request already in progress)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'A request with this Idempotency-Key is already in progress.' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/payment/{id}': {
      get: {
        summary: 'Get payment details by ID',
        description: 'Retrieves current status and details for a payment record.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              pattern: '^[0-9a-fA-F]{24}$',
            },
            description: 'The MongoDB 24-character hexadecimal payment ID',
            example: '6a195938e43bdb09e0b5e909',
          },
        ],
        responses: {
          200: {
            description: 'Payment details retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', pattern: '^[0-9a-fA-F]{24}$', example: '6a195938e43bdb09e0b5e909' },
                    amount: { type: 'number', example: 50.00 },
                    currency: { type: 'string', example: 'USD' },
                    status: { type: 'string', example: 'SUCCESS' },
                    idempotencyKey: { type: 'string', example: '70db82aa-36a2-4ee5-ba2d-f2f3ca8a386f' },
                    externalReferenceId: { type: 'string', example: 'tx_fffcaf09a0174876' },
                    failureReason: { type: 'string', nullable: true, example: null },
                    retryCount: { type: 'integer', example: 0 },
                    maxRetries: { type: 'integer', example: 3 },
                    createdAt: { type: 'string', format: 'date-time', example: '2026-05-29T16:15:00.000Z' },
                    updatedAt: { type: 'string', format: 'date-time', example: '2026-05-29T16:15:05.000Z' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Payment not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Payment with ID 6a195938e43bdb09e0b5e909 not found.' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/payment/{id}/retry': {
      post: {
        summary: 'Manually retry a failed payment',
        description: 'Resets the retry count and transitions the payment status from FAILED back to RETRYING, queueing a new BullMQ processing job.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              pattern: '^[0-9a-fA-F]{24}$',
            },
            description: 'The failed payment ID',
            example: '6a195938e43bdb09e0b5e909',
          },
        ],
        responses: {
          200: {
            description: 'Retry process successfully initiated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Payment retry initiated.' },
                    id: { type: 'string', pattern: '^[0-9a-fA-F]{24}$', example: '6a195938e43bdb09e0b5e909' },
                    status: { type: 'string', example: 'RETRYING' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Payment is not in a FAILED state and cannot be retried',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Payment 6a195938e43bdb09e0b5e909 is in status SUCCESS and cannot be manually retried.' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Payment not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Payment with ID 6a195938e43bdb09e0b5e909 not found.' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/webhooks': {
      post: {
        summary: 'Handle gateway webhook callback',
        description: 'Processes status updates from the external gateway asynchronously. Verifies validity of payload using HMAC-SHA256 signature in X-Gateway-Signature header.',
        parameters: [
          {
            name: 'X-Gateway-Signature',
            in: 'header',
            required: true,
            schema: {
              type: 'string',
            },
            description: 'HMAC hex signature of the request body generated using WEBHOOK_SECRET.',
            example: 'ef2a0f81d11b22e7d7a22efc18ba6a7d18bf6cba7b2cde8a1d7f87bc6e08ba2c',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['event', 'data'],
                properties: {
                  event: { type: 'string', example: 'payment.updated' },
                  data: {
                    type: 'object',
                    required: ['paymentId', 'externalReferenceId', 'status', 'amount', 'currency'],
                    properties: {
                      paymentId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$', example: '6a195938e43bdb09e0b5e909' },
                      externalReferenceId: { type: 'string', example: 'tx_fffcaf09a0174876' },
                      status: { type: 'string', enum: ['SUCCESS', 'FAILED'], example: 'SUCCESS' },
                      amount: { type: 'number', example: 50.00 },
                      currency: { type: 'string', example: 'USD' },
                      failureReason: { type: 'string', nullable: true, example: null },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Webhook processed successfully or duplicate event ignored',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    received: { type: 'boolean', example: true },
                  },
                },
              },
            },
          },
          401: {
            description: 'Invalid signature',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Invalid gateway signature.' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
