import { z } from 'zod';

import { amountCentsSchema } from '@/lib/money';

// Server Action: createPaymentRequest
export const createPaymentRequestSchema = z.object({
  recipient_email: z.string().email('must be a valid email address').max(254),
  amount_cents: amountCentsSchema,
  memo: z.string().max(280, 'memo must be at most 280 characters').nullable().optional(),
});

// Server Action: payRequest / declineRequest / cancelRequest — same shape
export const payRequestSchema = z.object({
  request_id: z.string().uuid('must be a valid request id'),
});

export const declineRequestSchema = payRequestSchema;
export const cancelRequestSchema = payRequestSchema;

// Inferred types for Server Action signatures
export type CreatePaymentRequestInput = z.infer<typeof createPaymentRequestSchema>;
export type PayRequestInput = z.infer<typeof payRequestSchema>;
export type DeclineRequestInput = z.infer<typeof declineRequestSchema>;
export type CancelRequestInput = z.infer<typeof cancelRequestSchema>;
