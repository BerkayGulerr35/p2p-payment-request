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

// Each `process.env.X` access is inlined by Next.js's webpack at build time.
// We must enumerate them explicitly: passing `process.env` directly yields an
// empty object in the browser bundle and breaks validation for required
// NEXT_PUBLIC_* fields.
const parsed = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_DEV_LOGIN: process.env.NEXT_PUBLIC_DEV_LOGIN,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  PAYMENT_REQUEST_MAX_CENTS: process.env.PAYMENT_REQUEST_MAX_CENTS,
});

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
