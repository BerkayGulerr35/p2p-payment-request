import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';
import type { Database } from '@/types/database';

// Service-role Supabase client. USE ONLY in trusted server modules
// (admin tasks, seeds, dev-mode login mock). For request-scoped Server
// Components and Server Actions, use createSupabaseServerClient() from
// './ssr' instead — that path goes through RLS via the user's session.
export function createServiceRoleClient() {
  if (!env.SUPABASE_SECRET_KEY) {
    throw new Error(
      'SUPABASE_SECRET_KEY is required for the service-role client. Check your .env.local.',
    );
  }
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
