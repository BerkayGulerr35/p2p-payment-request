import { createClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';
import type { Database } from '@/types/database';

// Fully anonymous Supabase client — no session cookies, no service role.
// Use only for the public read-only summary page (`/r/[public_id]`),
// which queries the `payment_requests_public` view granted to `anon`.
export function createAnonClient() {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
