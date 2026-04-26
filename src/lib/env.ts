import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_DEV_LOGIN: z.enum(['0', '1']).default('0'),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  PAYMENT_REQUEST_MAX_CENTS: z
    .string()
    .default('100000000')
    .transform((v) => Number.parseInt(v, 10))
    .refine((n) => Number.isInteger(n) && n > 0, {
      message: 'PAYMENT_REQUEST_MAX_CENTS must be a positive integer',
    }),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
