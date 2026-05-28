import { ENV, FRONTEND_URL } from '@/config';

const origin = "*";

export const corsConfig = {
  origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
