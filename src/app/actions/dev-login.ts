'use server';

import { notFound, redirect } from 'next/navigation';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { createSupabaseServerClient } from '@/lib/supabase/ssr';

const PERSONAS = {
  alice: { email: 'alice@example.com', display_name: 'Alice' },
  bob: { email: 'bob@example.com', display_name: 'Bob' },
} as const;

type Persona = keyof typeof PERSONAS;

function devPassword(persona: Persona): string {
  return `dev-${persona}-do-not-deploy-2026`;
}

// Dev-only Server Action that signs in as a seeded persona without an inbox round-trip.
// Hard-blocked in production builds.
// On the first call for each persona the user is created lazily via the admin API.
export async function devLoginAs(persona: Persona): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  if (process.env.NEXT_PUBLIC_DEV_LOGIN !== '1') {
    notFound();
  }

  const config = PERSONAS[persona];
  if (!config) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: config.email,
    password: devPassword(persona),
  });

  if (signInError) {
    // Most likely cause: the user does not exist yet. Create lazily, then retry.
    const admin = createServiceRoleClient();
    const { error: createError } = await admin.auth.admin.createUser({
      email: config.email,
      password: devPassword(persona),
      email_confirm: true,
      user_metadata: { display_name: config.display_name },
    });
    if (createError) {
      throw createError;
    }
    const { error: retryError } = await supabase.auth.signInWithPassword({
      email: config.email,
      password: devPassword(persona),
    });
    if (retryError) {
      throw retryError;
    }
  }

  redirect('/dashboard');
}
