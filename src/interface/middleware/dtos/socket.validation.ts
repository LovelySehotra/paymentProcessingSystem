import { z } from 'zod';

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
  content: z.string().min(1, 'Message content cannot be empty'),
});

export const markReadSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
  messageId: z.string().min(1, 'Message ID is required'),
});

export const messageReadSchema = z.object({
  messageId: z.string().min(1, 'Message ID is required'),
  conversationId: z.string().min(1, 'Conversation ID is required'),
});
