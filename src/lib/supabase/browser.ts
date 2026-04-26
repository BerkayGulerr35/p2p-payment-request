'use client';

import { createBrowserClient } from '@supabase/ssr';

import { env } from '@/lib/env';
import type { Database } from '@/types/database';

// User-scoped browser Supabase client. Use inside Client Components only.
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
